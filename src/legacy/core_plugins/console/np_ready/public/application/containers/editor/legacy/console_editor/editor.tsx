/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { debounce } from 'lodash';
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import $ from 'jquery';

// Node v5 querystring for browser.
// @ts-ignore
import * as qs from 'querystring-browser';

import { EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useAppContext } from '../../../../context';
import { useUIAceKeyboardMode } from '../use_ui_ace_keyboard_mode';
import { ConsoleMenu } from '../../../../components';

import { autoIndent, getDocumentation } from '../console_menu_actions';
import { registerCommands } from './keyboard_shortcuts';
import { applyCurrentSettings } from './apply_editor_settings';

// @ts-ignore
import { initializeInput } from '../../../../../../../public/quarantined/src/input';
// @ts-ignore
import mappings from '../../../../../../../public/quarantined/src/mappings';

import { useEditorActionContext, useEditorReadContext } from '../../context';
import { subscribeResizeChecker } from '../subscribe_console_resize_checker';

export interface EditorProps {
  previousStateLocation?: 'stored' | string;
}

const abs: CSSProperties = {
  position: 'absolute',
  top: '0',
  left: '0',
  bottom: '0',
  right: '0',
};

const DEFAULT_INPUT_VALUE = `GET _search
{
  "query": {
    "match_all": {}
  }
}`;

function _Editor({ previousStateLocation = 'stored' }: EditorProps) {
  const {
    services: { history, notifications },
    ResizeChecker,
    docLinkVersion,
  } = useAppContext();

  const { settings } = useEditorReadContext();
  const dispatch = useEditorActionContext();

  const editorRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any | null>(null);

  const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);
  useUIAceKeyboardMode(textArea);

  const openDocumentation = async () => {
    const documentation = await getDocumentation(editorInstanceRef.current!, docLinkVersion);
    if (!documentation) {
      return;
    }
    window.open(documentation, '_blank');
  };

  useEffect(() => {
    const $editor = $(editorRef.current!);
    const $actions = $(actionsRef.current!);
    editorInstanceRef.current = initializeInput($editor, $actions);
    const editor = editorInstanceRef.current;

    const readQueryParams = () => {
      const [, queryString] = (window.location.hash || '').split('?');
      return qs.parse(queryString || '');
    };

    const loadBufferFromRemote = (url: string) => {
      if (/^https?:\/\//.test(url)) {
        const loadFrom: Record<string, any> = {
          url,
          // Having dataType here is required as it doesn't allow jQuery to `eval` content
          // coming from the external source thereby preventing XSS attack.
          dataType: 'text',
          kbnXsrfToken: false,
        };

        if (/https?:\/\/api\.github\.com/.test(url)) {
          loadFrom.headers = { Accept: 'application/vnd.github.v3.raw' };
        }

        // Fire and forget.
        $.ajax(loadFrom).done(async data => {
          const coreEditor = editor.getCoreEditor();
          await editor.update(data, true);
          editor.moveToNextRequestEdge(false);
          coreEditor.clearSelection();
          editor.highlightCurrentRequestsAndUpdateActionBar();
          coreEditor.getContainer().focus();
        });
      }
    };

    // Support for loading a console snippet from a remote source, like support docs.
    const onHashChange = debounce(() => {
      const { load_from: url } = readQueryParams();
      if (!url) {
        return;
      }
      loadBufferFromRemote(url);
    }, 200);
    window.addEventListener('hashchange', onHashChange);

    const initialQueryParams = readQueryParams();
    if (initialQueryParams.load_from) {
      loadBufferFromRemote(initialQueryParams.load_from);
    } else {
      const { content } = history.getSavedEditorState() || {
        content: DEFAULT_INPUT_VALUE,
      };
      editorInstanceRef.current.update(content);
    }

    function setupAutosave() {
      let timer: number;
      const saveDelay = 500;

      return editorInstanceRef.current.getSession().on('change', function onChange() {
        if (timer) {
          clearTimeout(timer);
        }
        timer = window.setTimeout(saveCurrentState, saveDelay);
      });
    }

    function saveCurrentState() {
      try {
        const content = editorInstanceRef.current.getValue();
        history.updateCurrentState(content);
      } catch (e) {
        // Ignoring saving error
      }
    }

    dispatch({
      type: 'setInputEditor',
      value: editorInstanceRef.current,
    });

    setTextArea(editorRef.current!.querySelector('textarea'));

    mappings.retrieveAutoCompleteInfo();

    const unsubscribeResizer = subscribeResizeChecker(
      ResizeChecker,
      editorRef.current!,
      editorInstanceRef.current
    );
    const unsubscribeAutoSave = setupAutosave();

    return () => {
      unsubscribeResizer();
      unsubscribeAutoSave();
      mappings.clearSubscriptions();
    };
  }, []);

  const sendCurrentRequestToES = useCallback(() => {
    dispatch({
      type: 'sendRequestToEs',
      value: {
        isUsingTripleQuotes: settings.tripleQuotes,
        isPolling: settings.polling,
        callback: (esPath: any, esMethod: any, esData: any) =>
          history.addToHistory(esPath, esMethod, esData),
      },
    });
  }, [settings]);

  useEffect(() => {
    applyCurrentSettings(editorInstanceRef.current!, settings);
    // Preserve legacy focus behavior after settings have updated.
    editorInstanceRef.current!.focus();
  }, [settings]);

  useEffect(() => {
    registerCommands({
      input: editorInstanceRef.current,
      sendCurrentRequestToES,
      openDocumentation,
    });
  }, [sendCurrentRequestToES]);

  return (
    <div style={abs} className="conApp">
      <div className="conApp__editor">
        <ul className="conApp__autoComplete" id="autocomplete" />
        <EuiFlexGroup
          ref={actionsRef}
          className="conApp__editorActions"
          id="ConAppEditorActions"
          gutterSize="none"
          responsive={false}
        >
          <EuiFlexItem>
            <EuiToolTip
              content={i18n.translate('console.sendRequestButtonTooltip', {
                defaultMessage: 'click to send request',
              })}
            >
              <button
                onClick={sendCurrentRequestToES}
                data-test-subj="sendRequestButton"
                className="conApp__editorActionButton conApp__editorActionButton--success"
              >
                <EuiIcon type="play" />
              </button>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <ConsoleMenu
              getCurl={(cb: any) => {
                editorInstanceRef.current!.getRequestsAsCURL(cb);
              }}
              getDocumentation={() => {
                return getDocumentation(editorInstanceRef.current!, docLinkVersion);
              }}
              autoIndent={(event: any) => {
                autoIndent(editorInstanceRef.current!, event);
              }}
              addNotification={({ title }) => notifications.toasts.add({ title })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <div
          ref={editorRef}
          id="ConAppEditor"
          className="conApp__editorContent"
          data-test-subj="request-editor"
        />
      </div>
    </div>
  );
}

export const Editor = React.memo(_Editor);
