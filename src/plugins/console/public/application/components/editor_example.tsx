/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import * as senseEditor from '../models/sense_editor';
// @ts-ignore
import * as InputMode from '../models/legacy_core_editor/mode/input';

interface EditorExampleProps {
  panel: string;
}

const exampleText = `
# index a doc
PUT index/_doc/1
{
  "body": "here"
}

# and get it ...
GET index/_doc/1
`;

export function EditorExample(props: EditorExampleProps) {
  const elemId = `help-example-${props.panel}`;
  const inputId = `help-example-${props.panel}-input`;

  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<senseEditor.CustomAceEditor | null>(null);

  useEffect(() => {
    editorInstanceRef.current = senseEditor.createReadOnlyAceEditor(editorRef.current!);
    const editor = editorInstanceRef.current;
    const textareaElement = editorRef.current!.querySelector('textarea');
    editor.update(exampleText.trim());
    editor.session.setMode(new InputMode.Mode());
    editor.session.setUseWorker(false);
    editor.setHighlightActiveLine(false);

    if (textareaElement) {
      textareaElement.setAttribute('id', inputId);
      textareaElement.setAttribute('readonly', 'true');
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
      }
    };
  }, [elemId, inputId]);

  return (
    <>
      <EuiScreenReaderOnly>
        <label htmlFor={inputId}>
          {i18n.translate('console.exampleOutputTextarea', {
            defaultMessage: 'Dev Tools Console editor example',
          })}
        </label>
      </EuiScreenReaderOnly>
      <div id={elemId} ref={editorRef} className="conHelp__example" />
    </>
  );
}
