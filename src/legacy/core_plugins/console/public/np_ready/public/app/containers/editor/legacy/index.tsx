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
import $ from 'jquery';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// @ts-ignore
import { initializeInput } from '../../../../../../quarantined/src/input';
// @ts-ignore
import { initializeOutput } from '../../../../../../quarantined/src/output';
// @ts-ignore
import { ConsoleMenu } from '../../../../../../quarantined/src/components/console_menu';
// @ts-ignore
import init from '../../../../../../quarantined/src/app';

import { autoIndent, getDocumentation } from './console_menu_actions';
import { Panel, PanelContainer } from '../../../components/split_panel';

import { useUIAceKeyboardMode } from './use_ui_ace_keyboard_mode';

const PANEL_MIN_WIDTH = '100px';

const abs: CSSProperties = {
  position: 'absolute',
  top: '0',
  left: '0',
  bottom: '0',
  right: '0',
};

export interface EditorProps {
  docLinkVersion: string;
  onPanelWidthChange: (widths: number[]) => void;
  initialInputPanelWidth: number;
  initialOutputPanelWidth: number;
}

export function ConsoleEditor({
  onPanelWidthChange,
  docLinkVersion,
  initialInputPanelWidth,
  initialOutputPanelWidth,
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const [, setLastRequestTimestamp] = useState<number>(null as any);
  const [editor, setEditor] = useState<any>(null as any);
  const [, setOutput] = useState<any>(null as any);
  const [maybeTextArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);

  const sendCurrentRequest = () => {
    editor.focus();
    editor.sendCurrentRequestToES(() => {
      // History watches this value and will re-render itself when it changes, so that
      // the list of requests stays up-to-date as new requests are sent.
      setLastRequestTimestamp(new Date().getTime());
    });
    return false;
  };

  useEffect(() => {
    const editor$ = $(editorRef.current!);
    const output$ = $(outputRef.current!);
    const actions$ = $(actionsRef.current!);

    const outputEditor = initializeOutput(output$);
    const inputEditor = initializeInput(editor$, actions$, outputEditor);
    init(inputEditor, outputEditor);

    const session = inputEditor.getSession();
    session.getSelection().on('changeCursor', () => {
      // Fire and forget
      getDocumentation(inputEditor, docLinkVersion);
    });

    setTextArea(editorRef.current!.querySelector('textarea'));
    setOutput(outputEditor);
    setEditor(inputEditor);
  }, []);

  useUIAceKeyboardMode(maybeTextArea);

  return (
    <PanelContainer onPanelWidthChange={onPanelWidthChange}>
      <Panel
        style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
        initialWidth={initialInputPanelWidth + '%'}
      >
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
                  data-test-subj="send-request-button"
                  className="conApp__editorActionButton conApp__editorActionButton--success"
                >
                  <i className="fa fa-play" />
                </button>
              </EuiToolTip>
              <ConsoleMenu
                getCurl={(cb: any) => {
                  editor.getRequestsAsCURL(cb);
                }}
                openDocumentation={() => {}}
                getDocumentation={() => {
                  return getDocumentation(editor, docLinkVersion);
                }}
                autoIndent={(event: any) => {
                  autoIndent(editor, event);
                }}
              />
            </div>
            <div ref={editorRef} id="ConAppEditor" className="conApp__editorContent">
              {`GET _search
  {
    "query": { "match_all": { } }
  }`}
            </div>
          </div>
        </div>
      </Panel>
      <Panel
        style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
        initialWidth={initialOutputPanelWidth + '%'}
      >
        <div className="conApp__output" data-test-subj="response-editor">
          <div ref={outputRef} className="conApp__outputContent" id="ConAppOutput">{`{}`}</div>
        </div>
      </Panel>
    </PanelContainer>
  );
}
