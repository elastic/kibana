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
import { ace } from '@kbn/es-ui-shared-plugin/public';
import { ConsoleMenu } from '../../../../components';
import { useEditorReadContext, useServicesContext } from '../../../../contexts';
import {
  useSaveCurrentTextObject,
  useSendCurrentRequest,
  useSetInputEditor,
} from '../../../../hooks';
import * as senseEditor from '../../../../models/sense_editor';
import { autoIndent, getDocumentation } from '../console_menu_actions';
import { subscribeResizeChecker } from '../subscribe_console_resize_checker';
import { applyCurrentSettings } from './apply_editor_settings';
import { registerCommands } from './keyboard_shortcuts';
import type { SenseEditor } from '../../../../models/sense_editor';
import { StorageKeys } from '../../../../../services';
import { DEFAULT_INPUT_VALUE } from '../../../../../../common/constants';

const { useUIAceKeyboardMode } = ace;

export interface EditorProps {
  initialTextValue: string;
  setEditorInstance: (instance: SenseEditor) => void;
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

const inputId = 'ConAppInputTextarea';

function EditorUI({ initialTextValue, setEditorInstance }: EditorProps) {
  const {
    services: {
      history,
      notifications,
      settings: settingsService,
      esHostService,
      http,
      autocompleteInfo,
      storage,
    },
    docLinkVersion,
    ...startServices
  } = useServicesContext();

  const { settings } = useEditorReadContext();
  const setInputEditor = useSetInputEditor();
  const sendCurrentRequest = useSendCurrentRequest();
  const saveCurrentTextObject = useSaveCurrentTextObject();

  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<senseEditor.SenseEditor | null>(null);

  const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);
  useUIAceKeyboardMode(textArea, startServices, settings.isAccessibilityOverlayEnabled);

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
      const [, queryString] = (window.location.hash || window.location.search || '').split('?');

      return parse(queryString || '', { sort: false }) as Required<QueryParams>;
    };

    const loadBufferFromRemote = (url: string) => {
      const coreEditor = editor.getCoreEditor();
      // Normalize and encode the URL to avoid issues with spaces and other special characters.
      const encodedUrl = new URL(url).toString();
      if (/^https?:\/\//.test(encodedUrl)) {
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

    function restoreFolds() {
      if (editor) {
        const foldRanges = storage.get(StorageKeys.FOLDS, []);
        editor.getCoreEditor().addFoldsAtRanges(foldRanges);
      }
    }

    restoreFolds();

    function saveFoldsOnChange() {
      if (editor) {
        editor.getCoreEditor().on('changeFold', () => {
          const foldRanges = editor.getCoreEditor().getAllFoldRanges();
          storage.set(StorageKeys.FOLDS, foldRanges);
        });
      }
    }

    saveFoldsOnChange();

    setInputEditor(editor);
    setTextArea(editorRef.current!.querySelector('textarea'));

    autocompleteInfo.retrieve(settingsService, settingsService.getAutocomplete());

    const unsubscribeResizer = subscribeResizeChecker(editorRef.current!, editor);
    if (!initialQueryParams.load_from) {
      // Don't setup autosaving editor content when we pre-load content
      // This prevents losing the user's current console content when
      // `loadFrom` query param is used for a console session
      setupAutosave();
    }

    return () => {
      unsubscribeResizer();
      autocompleteInfo.clearSubscriptions();
      window.removeEventListener('hashchange', onHashChange);
      if (editorInstanceRef.current) {
        // Close autocomplete popup on unmount
        editorInstanceRef.current?.getCoreEditor().detachCompleter();
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
    autocompleteInfo,
    storage,
  ]);

  useEffect(() => {
    const { current: editor } = editorInstanceRef;
    applyCurrentSettings(editor!.getCoreEditor(), settings);
    // Preserve legacy focus behavior after settings have updated.
    editor!.getCoreEditor().getContainer().focus();
  }, [settings]);

  useEffect(() => {
    const { isKeyboardShortcutsEnabled } = settings;
    if (isKeyboardShortcutsEnabled) {
      registerCommands({
        senseEditor: editorInstanceRef.current!,
        sendCurrentRequest,
        openDocumentation,
      });
    }
  }, [openDocumentation, settings, sendCurrentRequest]);

  useEffect(() => {
    const { current: editor } = editorInstanceRef;
    if (editor) {
      setEditorInstance(editor);
    }
  }, [setEditorInstance]);

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
              content={i18n.translate('console.sendRequestButtonTooltipContent', {
                defaultMessage: 'Click to send request',
              })}
            >
              <EuiLink
                color="primary"
                onClick={sendCurrentRequest}
                data-test-subj="sendRequestButton"
                aria-label={i18n.translate('console.sendRequestButtonTooltipAriaLabel', {
                  defaultMessage: 'Click to send request',
                })}
              >
                <EuiIcon type="play" />
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
