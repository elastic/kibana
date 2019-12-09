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
import $ from 'jquery';

// @ts-ignore
import { initializeOutput } from '../../../../../../../public/quarantined/src/output';
import {
  useServicesContext,
  useEditorReadContext,
  useRequestReadContext,
} from '../../../../contexts';

// @ts-ignore
import utils from '../../../../../../../public/quarantined/src/utils';

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
  const editorInstanceRef = useRef<null | any>(null);
  const { services } = useServicesContext();

  const { settings: readOnlySettings } = useEditorReadContext();
  const {
    lastResult: { data, error },
  } = useRequestReadContext();

  useEffect(() => {
    const editor$ = $(editorRef.current!);
    editorInstanceRef.current = initializeOutput(editor$, services.settings);
    const unsubscribe = subscribeResizeChecker(editorRef.current!, editorInstanceRef.current);

    return () => {
      unsubscribe();
    };
  }, [services.settings]);

  useEffect(() => {
    if (data) {
      const mode = modeForContentType(data[0].response.contentType);
      editorInstanceRef.current.session.setMode(mode);
      editorInstanceRef.current.update(
        data
          .map(d => d.response.value)
          .map(readOnlySettings.tripleQuotes ? utils.expandLiteralStrings : a => a)
          .join('\n')
      );
    } else if (error) {
      editorInstanceRef.current.session.setMode(modeForContentType(error.contentType));
      editorInstanceRef.current.update(error.value);
    } else {
      editorInstanceRef.current.update('');
    }
  }, [readOnlySettings, data, error]);

  useEffect(() => {
    applyCurrentSettings(editorInstanceRef.current, readOnlySettings);
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
