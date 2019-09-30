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

import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import $ from 'jquery';

import { EuiIcon } from '@elastic/eui';
import { useAppContext } from '../../../../context';
import { useUIAceKeyboardMode } from '../use_ui_ace_keyboard_mode';
import { ConsoleMenu } from '../../../../components';
import { autoIndent, getDocumentation } from '../console_menu_actions';
import { registerCommands } from './keyboard_shortcuts';

// @ts-ignore
import { initializeInput } from '../../../../../../../public/quarantined/src/input';

export interface EditorProps {
  onEditorReady?: (editor: any) => void;
  sendCurrentRequest?: () => void;
  docLinkVersion: string;
}

const abs: CSSProperties = {
  position: 'absolute',
  top: '0',
  left: '0',
  bottom: '0',
  right: '0',
};

function Component({ onEditorReady, docLinkVersion, sendCurrentRequest = () => {} }: EditorProps) {
  const {
    services: { history, settings },
  } = useAppContext();

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
    editorInstanceRef.current = initializeInput($editor, $actions, history, settings);
    if (onEditorReady) {
      onEditorReady({ editor: editorInstanceRef.current, element: editorRef.current! });
    }

    setTextArea(editorRef.current!.querySelector('textarea'));
  }, []);

  useEffect(() => {
    registerCommands({
      input: editorInstanceRef.current,
      sendCurrentRequestToES: sendCurrentRequest,
      openDocumentation,
    });
  }, [sendCurrentRequest]);

  return (
    <div style={abs} className="conApp">
      <div className="conApp__editor">
        <ul className="conApp__autoComplete" id="autocomplete" />
        <div ref={actionsRef} className="conApp__editorActions" id="ConAppEditorActions">
          <EuiToolTip
            content={i18n.translate('console.sendRequestButtonTooltip', {
              defaultMessage: 'click to send request',
            })}
          >
            <button
              onClick={sendCurrentRequest}
              data-test-subj="sendRequestButton"
              className="conApp__editorActionButton conApp__editorActionButton--success"
            >
              <EuiIcon type="play" />
            </button>
          </EuiToolTip>
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
          />
        </div>
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

export const Editor = React.memo(Component);
