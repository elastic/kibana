/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import * as generateTriggerSnippetModule from './generate_trigger_snippet';
import { insertTriggerSnippet } from './insert_trigger_snippet';
import { createFakeMonacoModel } from '../../../../../common/mocks/monaco_model';

describe('insertTriggerSnippet', () => {
  let generateTriggerSnippetSpy: jest.SpyInstance;

  beforeEach(() => {
    generateTriggerSnippetSpy = jest.spyOn(generateTriggerSnippetModule, 'generateTriggerSnippet');
    jest.clearAllMocks();
  });

  it('should insert a trigger snippet after the last trigger', () => {
    const inputYaml = `triggers:\n  - type: alert\n`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);

    insertTriggerSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'manual');

    expect(generateTriggerSnippetSpy).toHaveBeenCalledWith('manual', {
      full: true,
      monacoSuggestionFormat: false,
      withTriggersSection: false,
    });

    const expectedSnippet = generateTriggerSnippetModule.generateTriggerSnippet('manual', {
      full: true,
      monacoSuggestionFormat: false,
    });

    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          // we expect the snippet to be inserted at the third line after the alert trigger
          range: new monaco.Range(3, 1, 3, 1),
          // should have 2 spaces before the snippet
          text: `  ${expectedSnippet}`,
        },
      ],
      expect.any(Function)
    );
  });
  it('should not override existing trigger of the same type', () => {
    const inputYaml = `triggers:\n  - type: manual`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertTriggerSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'manual');

    expect(generateTriggerSnippetSpy).not.toHaveBeenCalled();
    expect(model.pushEditOperations).not.toHaveBeenCalled();
  });
  it('should add the triggers section if it does not exist', () => {
    const inputYaml = `steps:\n  - type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);

    insertTriggerSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'manual');

    expect(generateTriggerSnippetSpy).toHaveBeenCalledWith('manual', {
      full: true,
      monacoSuggestionFormat: false,
      withTriggersSection: true,
    });

    const expectedSnippet = generateTriggerSnippetModule.generateTriggerSnippet('manual', {
      full: true,
      monacoSuggestionFormat: false,
      withTriggersSection: true,
    });

    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [{ range: new monaco.Range(1, 1, 1, 1), text: expectedSnippet }],
      expect.any(Function)
    );
  });

  it('should call pushUndoStop when editor is provided', () => {
    const inputYaml = `steps:\n  - type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    const mockEditor = {
      pushUndoStop: jest.fn(),
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    insertTriggerSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'manual',
      mockEditor
    );

    expect(mockEditor.pushUndoStop).toHaveBeenCalledTimes(2);
  });
});
