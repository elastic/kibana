/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import { expandLiteralStrings } from '../../../../../shared_imports';
import {
  useEditorReadContext,
  useRequestReadContext,
  useServicesContext,
} from '../../../../contexts';
import { createReadOnlyAceEditor, CustomAceEditor } from '../../../../models/legacy_core_editor';
import { subscribeResizeChecker } from '../subscribe_console_resize_checker';
import { applyCurrentSettings } from './apply_editor_settings';

function modeForContentType(contentType?: string) {
  if (!contentType) {
    return 'ace/mode/text';
  }
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
  const inputId = 'ConAppOutputTextarea';

  useEffect(() => {
    editorInstanceRef.current = createReadOnlyAceEditor(editorRef.current!);
    const unsubscribe = subscribeResizeChecker(editorRef.current!, editorInstanceRef.current);
    const textarea = editorRef.current!.querySelector('textarea')!;
    textarea.setAttribute('id', inputId);
    textarea.setAttribute('readonly', 'true');

    return () => {
      unsubscribe();
      editorInstanceRef.current!.destroy();
    };
  }, [services.settings]);

  useEffect(() => {
    const editor = editorInstanceRef.current!;
    if (data) {
      const mode = modeForContentType(data[0].response.contentType);
      editor.session.setMode(mode);
      editor.update(
        data
          .map((d) => d.response.value as string)
          .map(readOnlySettings.tripleQuotes ? expandLiteralStrings : (a) => a)
          .join('\n')
      );
    } else if (error) {
      editor.session.setMode(modeForContentType(error.response.contentType));
      editor.update(error.response.value as string);
    } else {
      editor.update('');
    }
  }, [readOnlySettings, data, error]);

  useEffect(() => {
    applyCurrentSettings(editorInstanceRef.current!, readOnlySettings);
  }, [readOnlySettings]);

  return (
    <>
      <EuiScreenReaderOnly>
        <label htmlFor={inputId}>
          {i18n.translate('console.outputTextarea', {
            defaultMessage: 'Dev Tools Console output',
          })}
        </label>
      </EuiScreenReaderOnly>
      <div ref={editorRef} className="conApp__output" data-test-subj="response-editor">
        <div className="conApp__outputContent" id="ConAppOutput" />
      </div>
    </>
  );
}

export const EditorOutput = React.memo(EditorOutputUI);
