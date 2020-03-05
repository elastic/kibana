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
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';

// Node v5 querystring for browser.
// @ts-ignore
import * as qs from 'querystring-browser';

import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiButtonIcon,
  EuiToolTip,
  EuiSpacer,
  EuiPopoverTitle,
  EuiButton,
  EuiText,
  EuiLink,
  EuiButtonEmpty,
} from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ConsoleInstruction } from 'src/core/server/pulse/collectors/console';
import { getEndpointFromPosition } from '../../../../../lib/autocomplete/get_endpoint_from_position';

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

export interface EditorProps {
  initialTextValue: string;
  pulseInstructions: ConsoleInstruction[];
}

interface InstructionWithEndpoint extends ConsoleInstruction {
  docLink?: string;
  takeMeThereHref: string;
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

function EditorUI({ initialTextValue, pulseInstructions }: EditorProps) {
  const {
    services: { history, notifications },
    docLinkVersion,
    elasticsearchUrl,
  } = useServicesContext();

  const [pulseNotificationIsOpen, setPulseNotificationIsOpen] = useState(false);
  const [pulseNotificationShowBell, setPulseNotificationShowBell] = useState(false);
  const [pulseInstruction, setPulseInstruction] = useState<InstructionWithEndpoint | undefined>();

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
        const coreEditor = editor.getCoreEditor();
        const content = coreEditor.getValue();
        saveCurrentTextObject(content);
      } catch (e) {
        // Ignoring saving error
        setPulseInstruction(undefined);
        setPulseNotificationShowBell(false);
      }
    }

    setInputEditor(editor);
    setTextArea(editorRef.current!.querySelector('textarea'));
    mappings.retrieveAutoCompleteInfo();

    const unsubscribeResizer = subscribeResizeChecker(editorRef.current!, editor);
    setupAutosave();

    return () => {
      unsubscribeResizer();
      mappings.clearSubscriptions();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [
    saveCurrentTextObject,
    initialTextValue,
    history,
    setInputEditor,
    // pulseInstructions,
    // pulseInstruction,
    // pulseNotificationShowBell,
  ]);

  window.setInterval(updatePulse, 3000);
  let updating = false;

  function updatePulse() {
    if (updating) {
      return;
    }
    updating = true;
    editorInstanceRef.current = senseEditor.create(editorRef.current!);
    const editor = editorInstanceRef.current;
    const coreEditor = editor.getCoreEditor();
    const endpointDescription = getEndpointFromPosition(
      coreEditor,
      coreEditor.getCurrentPosition(),
      editor.parser
    );
    if (endpointDescription) {
      const instruction = pulseInstructions.find(pulseInstructionPayload => {
        return pulseInstructionPayload.endpoint_id === endpointDescription.id;
      });
      if (instruction) {
        if (pulseInstruction?.endpoint_id === instruction?.endpoint_id) {
          return;
        }
        if (!pulseNotificationShowBell) {
          setPulseNotificationShowBell(true);
        }
        setPulseInstruction({
          docLink: endpointDescription.documentation,
          takeMeThereHref: `http://localhost:5601/app/kibana#${instruction.action?.href}`,
          ...instruction,
        });
      } else {
        setPulseInstruction(undefined);
        setPulseNotificationShowBell(false);
      }
    }
    updating = false;
  }

  useEffect(() => {
    const { current: editor } = editorInstanceRef;
    applyCurrentSettings(editor!.getCoreEditor(), settings);
    // Preserve legacy focus behavior after settings have updated.
    editor!
      .getCoreEditor()
      .getContainer()
      .focus();
  }, [settings]);

  useEffect(() => {
    registerCommands({
      senseEditor: editorInstanceRef.current!,
      sendCurrentRequestToES,
      openDocumentation,
    });
  }, [sendCurrentRequestToES, openDocumentation]);

  const pulseButton = (
    <EuiButtonIcon
      size="s"
      style={{ minHeight: '18px', paddingRight: '2px' }}
      className="animate-ring conApp__editorActionButton conApp__editorActionButton--success"
      iconType="bell"
      aria-label="pulse notification"
      onClick={() => {
        setPulseNotificationIsOpen(true);
      }}
    />
  );

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
            {pulseNotificationShowBell && !!pulseInstruction && (
              <EuiPopover
                id="pulse_popover"
                button={pulseButton}
                isOpen={pulseNotificationIsOpen}
                closePopover={() => {
                  setPulseNotificationIsOpen(false);
                }}
              >
                <EuiPopoverTitle>Pulse Recommendation</EuiPopoverTitle>
                <div style={{ width: '300px' }}>
                  <EuiText size="s">
                    <p>
                      {pulseInstruction.description.map((item, key) => {
                        switch (item.type) {
                          case 'text':
                            return item.text;
                          case 'docLink':
                            return (
                              <EuiLink
                                key={`${key}_item.text`}
                                href={pulseInstruction.docLink}
                                target="_blank"
                              >
                                {item.text}
                              </EuiLink>
                            );
                        }
                      })}
                    </p>
                  </EuiText>
                </div>
                <EuiSpacer />
                <div style={{ textAlign: 'right' }}>
                  <EuiButtonEmpty size="s">disable</EuiButtonEmpty>
                  {!!pulseInstruction.action && (
                    <EuiButton
                      size="s"
                      fill
                      color="primary"
                      style={{ marginLeft: '10px' }}
                      target="_blank"
                      href={pulseInstruction.takeMeThereHref}
                    >
                      Take me there!
                    </EuiButton>
                  )}
                </div>
              </EuiPopover>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiToolTip
              content={i18n.translate('console.sendRequestButtonTooltip', {
                defaultMessage: 'click to send request',
              })}
            >
              <button
                onClick={sendCurrentRequestToES}
                data-test-subj="sendRequestButton"
                aria-label={i18n.translate('console.sendRequestButtonTooltip', {
                  defaultMessage: 'click to send request',
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
                return editorInstanceRef.current!.getRequestsAsCURL(elasticsearchUrl);
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
