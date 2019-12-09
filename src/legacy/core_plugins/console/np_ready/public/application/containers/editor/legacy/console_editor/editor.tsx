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

import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import $ from 'jquery';

import { EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useServicesContext, useEditorReadContext } from '../../../../contexts';
import { useUIAceKeyboardMode } from '../use_ui_ace_keyboard_mode';
import { ConsoleMenu } from '../../../../components';

import { autoIndent, getDocumentation } from '../console_menu_actions';
import { registerCommands } from './keyboard_shortcuts';
import { applyCurrentSettings } from './apply_editor_settings';

import { useSendCurrentRequestToES, useSetInputEditor } from '../../../../hooks';

// @ts-ignore
import { initializeEditor } from '../../../../../../../public/quarantined/src/input';
// @ts-ignore
import mappings from '../../../../../../../public/quarantined/src/mappings';

import { subscribeResizeChecker } from '../subscribe_console_resize_checker';
import { loadRemoteState } from './load_remote_editor_state';

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

function EditorUI({ previousStateLocation = 'stored' }: EditorProps) {
  const {
    services: { history, notifications },
    docLinkVersion,
  } = useServicesContext();

  const { settings } = useEditorReadContext();
  const setInputEditor = useSetInputEditor();
  const sendCurrentRequestToES = useSendCurrentRequestToES();

  const editorRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any | null>(null);

  const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);
  useUIAceKeyboardMode(textArea);

  const openDocumentation = useCallback(async () => {
    const documentation = await getDocumentation(editorInstanceRef.current!, docLinkVersion);
    if (!documentation) {
      return;
    }
    window.open(documentation, '_blank');
  }, [docLinkVersion]);

  useEffect(() => {
    const $editor = $(editorRef.current!);
    const $actions = $(actionsRef.current!);
    editorInstanceRef.current = initializeEditor($editor, $actions);

    if (previousStateLocation === 'stored') {
      const { content } = history.getSavedEditorState() || {
        content: DEFAULT_INPUT_VALUE,
      };
      editorInstanceRef.current.update(content);
    } else {
      loadRemoteState({ url: previousStateLocation, input: editorInstanceRef.current });
    }

    function setupAutosave() {
      let timer: number;
      const saveDelay = 500;

      editorInstanceRef.current.getSession().on('change', function onChange() {
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

    setInputEditor(editorInstanceRef.current);
    setTextArea(editorRef.current!.querySelector('textarea'));

    mappings.retrieveAutoCompleteInfo();

    const unsubscribeResizer = subscribeResizeChecker(
      editorRef.current!,
      editorInstanceRef.current
    );
    setupAutosave();

    return () => {
      unsubscribeResizer();
      mappings.clearSubscriptions();
    };
  }, [history, previousStateLocation, setInputEditor]);

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
  }, [sendCurrentRequestToES, openDocumentation]);

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

        {/* Axe complains about Ace's textarea element missing a label, which interferes with our
        automated a11y tests per #52136. This wrapper does nothing to address a11y but it does
        satisfy Axe. */}

        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="conApp__textAreaLabelHack">
          <div
            ref={editorRef}
            id="ConAppEditor"
            className="conApp__editorContent"
            data-test-subj="request-editor"
          />
        </label>
      </div>
    </div>
  );
}

export const Editor = React.memo(EditorUI);
