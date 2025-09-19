/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMockModel } from '../../../../../common/mocks/monaco_model';
import { parseDocument } from 'yaml';
import { insertStepSnippet } from './insert_step_snippet';
import { monaco } from '@kbn/monaco';
import { generateBuiltInStepSnippet } from './generate_builtin_step_snippet';
import { prependIndentToLines } from '../prepend_indent_to_lines';

describe('insertStepSnippet', () => {
  it('should insert the "steps:" section if it does not exist', () => {
    const inputYaml = `name: one_step_workflow`;
    const model = createMockModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    const snippetText = generateBuiltInStepSnippet('http', false, true);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(2, 1, 2, 1),
          text: 'steps:\n  ' + snippetText + '\n',
        },
      ],
      expect.any(Function)
    );
  });
  it('should insert a step snippet after the last step', () => {
    const inputYaml = `name: one_step_workflow
steps:
  - name: get_google
    type: http
    with:
      url: https://google.com`;
    const model = createMockModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    const snippetText = generateBuiltInStepSnippet('http', false, true);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(7, 1, 7, 1),
          text: prependIndentToLines(snippetText, 2) + '\n',
        },
      ],
      expect.any(Function)
    );
  });
  it('should insert a step snippet after the last step in a nested step when cursor is at the beginning of the last step line', () => {
    const inputYaml = `name: nested_step_workflow
steps:
  - name: loop
    type: foreach
    foreach: "{{ context.items }}"
    steps:
      - name: get_google
        type: http
        with:
          url: https://google.com # cursor is here`;
    const model = createMockModel(inputYaml, { lineNumber: 10, column: 1 });
    const yamlDocument = parseDocument(inputYaml);
    const snippetText = generateBuiltInStepSnippet('http', false, true);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(11, 1, 11, 1),
          // since the last step is in a nested step, it should have 6 spaces of indent
          text: prependIndentToLines(snippetText, 6) + '\n',
        },
      ],
      expect.any(Function)
    );
  });
  it('should insert a step snippet between the nested steps if cursor is between them', () => {
    const inputYaml = `name: nested_step_workflow
steps:
  - name: loop
    type: foreach
    foreach: "{{ context.items }}"
    steps:
      - name: get_google
        type: http
        with:
          url: https://google.com # cursor is here
      - name: log_result
        type: console
        with:
          message: "{{ steps.get_google.output|json }}"
`;
    const model = createMockModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    const snippetText = generateBuiltInStepSnippet('http', false, true);
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(10, 33)
    );
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(11, 1, 11, 1),
          text: prependIndentToLines(snippetText, 6) + '\n',
        },
      ],
      expect.any(Function)
    );
  });
});
