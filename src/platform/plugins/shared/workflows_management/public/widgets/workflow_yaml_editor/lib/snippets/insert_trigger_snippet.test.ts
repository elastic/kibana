/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { insertTriggerSnippet } from './insert_trigger_snippet';
import { monaco } from '@kbn/monaco';
import { generateTriggerSnippet } from './generate_trigger_snippet';
import { createMockModel } from '../../../../../common/mocks/monaco_model';

describe('insertTriggerSnippet', () => {
  it('should insert a trigger snippet after the last trigger', () => {
    const inputYaml = `triggers:\n  - type: alert`;
    const model = createMockModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    const snippetText = generateTriggerSnippet('manual', false, true);
    insertTriggerSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'manual');
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(3, 1, 3, 1),
          // should have 2 spaces before the snippet and a newline after it
          text: '  ' + snippetText + '\n',
        },
      ],
      expect.any(Function)
    );
  });
  it('should not override existing trigger of the same type', () => {
    const inputYaml = `triggers:\n  - type: manual`;
    const model = createMockModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertTriggerSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'manual');
    expect(model.pushEditOperations).not.toHaveBeenCalled();
  });
  it('should add the triggers section if it does not exist', () => {
    const inputYaml = `steps:\n  - type: http`;
    const model = createMockModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    const snippetText = generateTriggerSnippet('manual', false, true);
    insertTriggerSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'manual');
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [{ range: new monaco.Range(1, 1, 1, 1), text: 'triggers:\n  ' + snippetText + '\n' }],
      expect.any(Function)
    );
  });
});
