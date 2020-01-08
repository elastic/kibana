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

import React, { useEffect, useRef } from 'react';
import { createReadOnlyAceEditor, CustomAceEditor } from '../../../../models/legacy_core_editor';
import {
  useServicesContext,
  useEditorReadContext,
  useRequestReadContext,
} from '../../../../contexts';

import * as utils from '../../../../../lib/utils/utils';

import { subscribeResizeChecker } from '../subscribe_console_resize_checker';
import { applyCurrentSettings } from './apply_editor_settings';

function modeForContentType(contentType: string) {
  if (contentType.indexOf('application/json') >= 0) {
    return 'ace/mode/json';
  } else if (contentType.indexOf('application/yaml') >= 0) {
    return 'ace/mode/yaml';
  }
  return 'ace/mode/text';
}

function EditorOutputUI() {
  const editorRef = useRef<null | HTMLDivElement>(null);
  const editorInstanceRef = useRef<null | CustomAceEditor>(null);
  const { services } = useServicesContext();

  const { settings: readOnlySettings } = useEditorReadContext();
  const {
    lastResult: { data, error },
  } = useRequestReadContext();

  useEffect(() => {
    editorInstanceRef.current = createReadOnlyAceEditor(editorRef.current!);
    const unsubscribe = subscribeResizeChecker(editorRef.current!, editorInstanceRef.current);

    return () => {
      unsubscribe();
    };
  }, [services.settings]);

  useEffect(() => {
    const editor = editorInstanceRef.current!;
    if (data) {
      const mode = modeForContentType(data[0].response.contentType);
      editor.session.setMode(mode);
      editor.update(
        data
          .map(d => d.response.value as string)
          .map(readOnlySettings.tripleQuotes ? utils.expandLiteralStrings : a => a)
          .join('\n')
      );
    } else if (error) {
      editor.session.setMode(modeForContentType(error.contentType));
      editor.update(error.value);
    } else {
      editor.update('');
    }
  }, [readOnlySettings, data, error]);

  useEffect(() => {
    applyCurrentSettings(editorInstanceRef.current!, readOnlySettings);
  }, [readOnlySettings]);

  return (
    <div ref={editorRef} className="conApp__output" data-test-subj="response-editor">
      {/* Axe complains about Ace's textarea element missing a label, which interferes with our
      automated a11y tests per #52136. This wrapper does nothing to address a11y but it does
      satisfy Axe. */}

      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="conApp__textAreaLabelHack">
        <div className="conApp__outputContent" id="ConAppOutput" />
      </label>
    </div>
  );
}

export const EditorOutput = React.memo(EditorOutputUI);
