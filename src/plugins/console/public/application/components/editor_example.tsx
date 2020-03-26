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
import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import exampleText from 'raw-loader!../constants/help_example.txt';
import React, { useEffect } from 'react';
import { createReadOnlyAceEditor } from '../models/legacy_core_editor';

interface EditorExampleProps {
  panel: string;
}

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
