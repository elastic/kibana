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
import { createReadOnlyAceEditor, CustomAceEditor } from '../models/sense_editor';
// @ts-ignore
import { Mode } from '../models/legacy_core_editor/mode/input';

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
  const inputId = `help-example-${props.panel}-input`;
  const wrapperDivRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<CustomAceEditor>();

  useEffect(() => {
    if (wrapperDivRef.current) {
      editorRef.current = createReadOnlyAceEditor(wrapperDivRef.current);

      const editor = editorRef.current;
      editor.update(exampleText.trim());
      editor.session.setMode(new Mode());
      editor.session.setUseWorker(false);
      editor.setHighlightActiveLine(false);

      const textareaElement = wrapperDivRef.current.querySelector('textarea');
      if (textareaElement) {
        textareaElement.setAttribute('id', inputId);
        textareaElement.setAttribute('readonly', 'true');
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [inputId]);

  return (
    <>
      <EuiScreenReaderOnly>
        <label htmlFor={inputId}>
          {i18n.translate('console.exampleOutputTextarea', {
            defaultMessage: 'Dev Tools Console editor example',
          })}
        </label>
      </EuiScreenReaderOnly>
      <div ref={wrapperDivRef} className="conHelp__example" />
    </>
  );
}
