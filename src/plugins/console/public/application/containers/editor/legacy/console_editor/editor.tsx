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

import React, {
  CSSProperties,
  FunctionComponent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { parse } from 'query-string';
import { EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useServicesContext, useEditorReadContext } from '../../../../contexts';
import { useUIAceKeyboardMode } from '../use_ui_ace_keyboard_mode';
import { ConsoleMenu } from '../../../../components';

import { autoIndent, getDocumentation } from '../console_menu_actions';
import { registerCommands } from './keyboard_shortcuts';
import { applyCurrentSettings } from './apply_editor_settings';

import {
  useSendCurrentRequestToES,
  useSetInputEditor,
  useSaveCurrentTextObject,
} from '../../../../hooks';

import * as senseEditor from '../../../../models/sense_editor';
// @ts-ignore
import mappings from '../../../../../lib/mappings/mappings';

import { subscribeResizeChecker } from '../subscribe_console_resize_checker';
import { TextObjectWithId } from '../../../../../../common/text_object';

export interface EditorProps {
  textObject: TextObjectWithId;
}

interface QueryParams {
  load_from: string;
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

/**
 * The current editor implementation does a bad job of cleaning up listeners,
 * even though we are calling "destroy" on the editor upon re-creating this component.
 *
 * We still see calls to on mouse scroll events after mounting a second instance.
 *
 * The solution here is to manually create the div element that the editor mounts
 * to then call ".remove()" on that to forcibly clean up any remaining listeners.
 *
 * In theory we could just unregister all listeners and avoid need to re-create the
 * entire editor after loading a new text object, but doing a hard refresh will
 * ensure we don't have stale editor state (like text annotations) that we forgot
 * to clean up or other listener memory leaks. If re-instantiating becomes a problem
 * each time we open a new text object then this can be revisited.
 */
const createEditorElement = () => {
  const el = document.createElement('div');
  el.id = 'ConAppEditor';
  el.className = 'conApp__editorContent';
  el.setAttribute('data-test-subj', 'request-editor');
  return el;
};

export const Editor: FunctionComponent<EditorProps> = memo(
  ({ textObject }) => {
    const {
      services: { history, notifications },
      docLinkVersion,
      elasticsearchUrl,
    } = useServicesContext();

    const { settings } = useEditorReadContext();
    const setInputEditor = useSetInputEditor();
    const sendCurrentRequestToES = useSendCurrentRequestToES();
    const saveCurrentTextObject = useSaveCurrentTextObject();

    const [editorInstance, setEditorInstance] = useState<senseEditor.SenseEditor | null>(null);

    const editorRef = useRef<HTMLDivElement | null>(null);

    const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);
    useUIAceKeyboardMode(textArea);

    const openDocumentation = useCallback(async () => {
      const documentation = await getDocumentation(editorInstance!, docLinkVersion);
      if (!documentation) {
        return;
      }
      window.open(documentation, '_blank');
    }, [docLinkVersion, editorInstance]);

    // Effect #1
    // - Instantiate the text editor and mount it to the DOM
    // - Register all listeners relevant to editing text like autosave
    // - Determine from where we need to be loading the initial buffer content
    useEffect(() => {
      editorRef.current = createEditorElement();
      const element = editorRef.current;
      const mountPoint = document.querySelector('#conAppEditorMount')!;
      mountPoint.appendChild(element);
      const editor = senseEditor.create(element);
      setEditorInstance(editor);

      const readQueryParams = () => {
        const [, queryString] = (window.location.hash || '').split('?');

        return parse(queryString || '', { sort: false }) as Required<QueryParams>;
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
            await editor.moveToNextRequestEdge(false);
            coreEditor.clearSelection();
            await editor.highlightCurrentRequestsAndUpdateActionBar();
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
        editor.update(textObject.text || DEFAULT_INPUT_VALUE);
      }

      function setupAutosave() {
        let timer: number;
        const saveDelay = 500;

        editor.getCoreEditor().on('change', () => {
          if (timer) {
            clearTimeout(timer);
          }
          timer = window.setTimeout(saveCurrentState, saveDelay);
        });
      }

      function saveCurrentState() {
        try {
          const content = editor.getCoreEditor().getValue();
          saveCurrentTextObject(content);
        } catch (e) {
          // Ignoring saving error
        }
      }

      setInputEditor(editor);
      setTextArea(editorRef.current!.querySelector('textarea'));

      mappings.retrieveAutoCompleteInfo();

      const unsubscribeResizer = subscribeResizeChecker(editorRef.current!, editor);
      setupAutosave();

      editor.init();

      return () => {
        unsubscribeResizer();
        mappings.clearSubscriptions();
        window.removeEventListener('hashchange', onHashChange);

        editor.getCoreEditor().destroy();
        // See the description of createEditorElement above for why we do this.
        element.remove();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveCurrentTextObject, textObject.id, history, setInputEditor]);

    // Effect #2
    // Apply user settings to current editor instance
    useEffect(() => {
      if (editorInstance) {
        applyCurrentSettings(editorInstance.getCoreEditor(), settings);
        // Preserve legacy focus behavior after settings have updated.
        editorInstance!
          .getCoreEditor()
          .getContainer()
          .focus();
      }
    }, [settings, editorInstance]);

    // Effect #3
    // Register keyboard shortcuts
    useEffect(() => {
      if (editorInstance) {
        registerCommands({
          senseEditor: editorInstance,
          sendCurrentRequestToES,
          openDocumentation,
        });
      }
    }, [sendCurrentRequestToES, openDocumentation, editorInstance]);

    return (
      <div style={abs} className="conApp">
        <div className="conApp__editor">
          <ul className="conApp__autoComplete" id="autocomplete" />
          <EuiFlexGroup
            className="conApp__editorActions"
            id="ConAppEditorActions"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem>
              <EuiToolTip
                content={i18n.translate('console.sendRequestButtonTooltip', {
                  defaultMessage: 'Click to send request',
                })}
              >
                <button
                  onClick={sendCurrentRequestToES}
                  data-test-subj="sendRequestButton"
                  aria-label={i18n.translate('console.sendRequestButtonTooltip', {
                    defaultMessage: 'Click to send request',
                  })}
                  className="conApp__editorActionButton conApp__editorActionButton--success"
                >
                  <EuiIcon type="play" />
                </button>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem>
              <ConsoleMenu
                getCurl={() => {
                  return editorInstance!.getRequestsAsCURL(elasticsearchUrl);
                }}
                getDocumentation={() => {
                  return getDocumentation(editorInstance!, docLinkVersion);
                }}
                autoIndent={(event: any) => {
                  autoIndent(editorInstance!, event);
                }}
                addNotification={({ title }) => notifications.toasts.add({ title })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          {/* Axe complains about Ace's textarea element missing a label, which interferes with our
        automated a11y tests per #52136. This wrapper does nothing to address a11y but it does
        satisfy Axe. */}

          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label id="conAppEditorMount" className="conApp__textAreaLabelHack" />
        </div>
      </div>
    );
  },
  ({ textObject: { id: previousId } }, { textObject: { id: nextId } }) => {
    return previousId === nextId;
  }
);
