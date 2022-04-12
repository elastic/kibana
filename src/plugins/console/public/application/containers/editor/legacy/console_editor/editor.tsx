/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { parse } from 'query-string';
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { ace } from '../../../../../../../es_ui_shared/public';
// @ts-ignore
import { retrieveAutoCompleteInfo, clearSubscriptions } from '../../../../../lib/mappings/mappings';
import { ConsoleMenu } from '../../../../components';
import { useEditorReadContext, useServicesContext } from '../../../../contexts';
import {
  useSaveCurrentTextObject,
  useSendCurrentRequestToES,
  useSetInputEditor,
} from '../../../../hooks';
import * as senseEditor from '../../../../models/sense_editor';
import { autoIndent, getDocumentation } from '../console_menu_actions';
import { subscribeResizeChecker } from '../subscribe_console_resize_checker';
import { applyCurrentSettings } from './apply_editor_settings';
import { registerCommands } from './keyboard_shortcuts';

const { useUIAceKeyboardMode } = ace;

export interface EditorProps {
  initialTextValue: string;
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

const inputId = 'ConAppInputTextarea';

function EditorUI({ initialTextValue }: EditorProps) {
  const {
    services: { history, notifications, settings: settingsService, esHostService, http },
    docLinkVersion,
  } = useServicesContext();

  const { settings } = useEditorReadContext();
  const setInputEditor = useSetInputEditor();
  const sendCurrentRequestToES = useSendCurrentRequestToES();
  const saveCurrentTextObject = useSaveCurrentTextObject();

  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<senseEditor.SenseEditor | null>(null);

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
    editorInstanceRef.current = senseEditor.create(editorRef.current!);
    const editor = editorInstanceRef.current;
    const textareaElement = editorRef.current!.querySelector('textarea');

    if (textareaElement) {
      textareaElement.setAttribute('id', inputId);
      textareaElement.setAttribute('data-test-subj', 'console-textarea');
    }

    const readQueryParams = () => {
      const [, queryString] = (window.location.hash || '').split('?');

      return parse(queryString || '', { sort: false }) as Required<QueryParams>;
    };

    const loadBufferFromRemote = (url: string) => {
      const coreEditor = editor.getCoreEditor();
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
        $.ajax(loadFrom).done(async (data) => {
          // when we load data from another Api we also must pass history
          await editor.update(`${initialTextValue}\n ${data}`, true);
          editor.moveToNextRequestEdge(false);
          coreEditor.clearSelection();
          editor.highlightCurrentRequestsAndUpdateActionBar();
          coreEditor.getContainer().focus();
        });
      }

      // If we have a data URI instead of HTTP, LZ-decode it. This enables
      // opening requests in Console from anywhere in Kibana.
      if (/^data:/.test(url)) {
        const data = decompressFromEncodedURIComponent(url.replace(/^data:text\/plain,/, ''));

        // Show a toast if we have a failure
        if (data === null || data === '') {
          notifications.toasts.addWarning(
            i18n.translate('console.loadFromDataUriErrorMessage', {
              defaultMessage: 'Unable to load data from the load_from query parameter in the URL',
            })
          );
          return;
        }

        editor.update(data, true);
        editor.moveToNextRequestEdge(false);
        coreEditor.clearSelection();
        editor.highlightCurrentRequestsAndUpdateActionBar();
        coreEditor.getContainer().focus();
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
      editor.update(initialTextValue || DEFAULT_INPUT_VALUE);
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

    retrieveAutoCompleteInfo(http, settingsService, settingsService.getAutocomplete());

    const unsubscribeResizer = subscribeResizeChecker(editorRef.current!, editor);
    setupAutosave();

    return () => {
      unsubscribeResizer();
      clearSubscriptions();
      window.removeEventListener('hashchange', onHashChange);
      if (editorInstanceRef.current) {
        editorInstanceRef.current.getCoreEditor().destroy();
      }
    };
  }, [
    notifications.toasts,
    saveCurrentTextObject,
    initialTextValue,
    history,
    setInputEditor,
    settingsService,
    http,
  ]);

  useEffect(() => {
    const { current: editor } = editorInstanceRef;
    applyCurrentSettings(editor!.getCoreEditor(), settings);
    // Preserve legacy focus behavior after settings have updated.
    editor!.getCoreEditor().getContainer().focus();
  }, [settings]);

  useEffect(() => {
    registerCommands({
      senseEditor: editorInstanceRef.current!,
      sendCurrentRequestToES,
      openDocumentation,
    });
  }, [sendCurrentRequestToES, openDocumentation]);

  return (
    <div style={abs} data-test-subj="console-application" className="conApp">
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
              <EuiLink
                color="success"
                onClick={sendCurrentRequestToES}
                data-test-subj="sendRequestButton"
                aria-label={i18n.translate('console.sendRequestButtonTooltip', {
                  defaultMessage: 'Click to send request',
                })}
              >
                <EuiIcon type="playFilled" />
              </EuiLink>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <ConsoleMenu
              getCurl={() => {
                return editorInstanceRef.current!.getRequestsAsCURL(esHostService.getHost());
              }}
              getDocumentation={() => {
                return getDocumentation(editorInstanceRef.current!, docLinkVersion);
              }}
              autoIndent={(event) => {
                autoIndent(editorInstanceRef.current!, event);
              }}
              notifications={notifications}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiScreenReaderOnly>
          <label htmlFor={inputId}>
            {i18n.translate('console.inputTextarea', {
              defaultMessage: 'Dev Tools Console',
            })}
          </label>
        </EuiScreenReaderOnly>
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

export const Editor = React.memo(EditorUI);
