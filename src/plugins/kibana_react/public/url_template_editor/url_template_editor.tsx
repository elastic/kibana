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

import * as React from 'react';
import { monaco } from '@kbn/monaco';
import { CodeEditor, Props as CodeEditorProps } from '../code_editor/code_editor';

monaco.languages.setMonarchTokensProvider('handlebars_url', {
  tokenizer: {
    root: [[/\{\{[^\}]+\}\}/, 'comment']],
  },
});
monaco.languages.register({ id: 'handlebars_url' });

export interface UrlTemplateEditorProps {
  value: string;
  onChange: CodeEditorProps['onChange'];
}

export const UrlTemplateEditor: React.FC<UrlTemplateEditorProps> = ({ value, onChange }) => {
  return <CodeEditor languageId="handlebars_url" height={250} value={value} onChange={onChange} />;
};
