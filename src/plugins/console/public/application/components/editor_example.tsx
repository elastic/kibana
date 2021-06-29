/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { createReadOnlyAceEditor } from '../models/legacy_core_editor';

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

  useEffect(() => {
    const el = document.getElementById(elemId)!;
    el.textContent = exampleText.trim();
    const editor = createReadOnlyAceEditor(el);
    const textarea = el.querySelector('textarea')!;
    textarea.setAttribute('id', inputId);
    textarea.setAttribute('readonly', 'true');

    return () => {
      editor.destroy();
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
      <div id={elemId} className="conHelp__example" />
    </>
  );
}
