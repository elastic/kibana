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
      [{ range: new monaco.Range(1, 1, 1, 1), text: `${expectedSnippet}\n` }],
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

  describe('when triggers section exists with empty item', () => {
    it('should replace empty item and add the selected trigger type', () => {
      const inputYaml = `triggers:\n  -\n`;
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
            range: new monaco.Range(2, 1, 3, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should replace empty item when there are no existing triggers', () => {
      const inputYaml = `triggers:\n  -`;
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
            range: new monaco.Range(2, 1, 2, 4),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should replace empty item even when there are existing triggers', () => {
      const inputYaml = `triggers:\n  - type: manual\n  -\n`;
      const model = createFakeMonacoModel(inputYaml);
      const yamlDocument = parseDocument(inputYaml);

      insertTriggerSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'alert');

      expect(generateTriggerSnippetSpy).toHaveBeenCalledWith('alert', {
        full: true,
        monacoSuggestionFormat: false,
        withTriggersSection: false,
      });

      const expectedSnippet = generateTriggerSnippetModule.generateTriggerSnippet('alert', {
        full: true,
        monacoSuggestionFormat: false,
      });

      expect(model.pushEditOperations).toHaveBeenCalledWith(
        null,
        [
          {
            range: new monaco.Range(3, 1, 4, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should replace first empty item when there are multiple empty items', () => {
      const inputYaml = `triggers:\n  -\n  -\n`;
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
            range: new monaco.Range(2, 1, 3, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should replace first empty item in mixed content (triggers and empty items)', () => {
      const inputYaml = `triggers:\n  - type: alert\n  - \n  - type: scheduled\n    with:\n      every: 5m`;
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
            range: new monaco.Range(3, 1, 4, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should replace empty item with trailing spaces', () => {
      const inputYaml = `triggers:\n  -  \n`;
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
            range: new monaco.Range(2, 1, 3, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should replace empty item with comment', () => {
      const inputYaml = `triggers:\n  - # comment\n`;
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
            range: new monaco.Range(2, 1, 3, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should replace empty item with trailing spaces and comment', () => {
      const inputYaml = `triggers:         \n  -  # comment\n`;
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
            range: new monaco.Range(2, 1, 3, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });
  });

  describe('when triggers section exists but is empty', () => {
    it('should insert trigger when triggers: (empty children)', () => {
      const inputYaml = `triggers:`;
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
            range: new monaco.Range(1, 10, 1, 10),
            text: `\n  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should insert trigger when triggers: [] (empty array)', () => {
      const inputYaml = `triggers: []`;
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
            range: new monaco.Range(1, 11, 1, 13),
            text: `\n  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should insert trigger when triggers section has only comments', () => {
      const inputYaml = `triggers:\n  # comment\n`;
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
            range: new monaco.Range(3, 1, 3, 1), // End of line 2 (after "# comment")
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should insert trigger after comment when triggers has trailing spaces', () => {
      const inputYaml = `triggers:    \n  # comment\n`;
      const model = createFakeMonacoModel(inputYaml);
      const yamlDocument = parseDocument(inputYaml);

      insertTriggerSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'manual');

      const expectedSnippet = generateTriggerSnippetModule.generateTriggerSnippet('manual', {
        full: true,
        monacoSuggestionFormat: false,
      });

      // Should insert at the end of line 2 (the comment line) with a newline
      // This will place the trigger after the comment
      expect(model.pushEditOperations).toHaveBeenCalledWith(
        null,
        [
          {
            range: new monaco.Range(3, 1, 3, 1), // End of line 2 (after "# comment")
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should replace empty item when there are comments before empty dash', () => {
      const inputYaml = `triggers:\n  # comment\n  -\n`;
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
            range: new monaco.Range(3, 1, 4, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should insert trigger when triggers section is completely empty (no items)', () => {
      const inputYaml = `triggers:\n`;
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
            range: new monaco.Range(2, 1, 2, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should insert trigger when triggers section has multiple comments', () => {
      const inputYaml = `triggers:\n  # first comment\n  # second comment\n`;
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
            range: new monaco.Range(5, 1, 5, 1),
            text: `  ${expectedSnippet}`,
          },
        ],
        expect.any(Function)
      );
    });
  });

  describe('when no triggers section exists', () => {
    it('should add triggers section completely with the selected trigger type', () => {
      const inputYaml = `name: New workflow`;
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
        [
          {
            range: new monaco.Range(1, 1, 1, 1),
            text: `${expectedSnippet}\n`,
          },
        ],
        expect.any(Function)
      );
    });

    it('should add triggers section when YAML is completely empty', () => {
      const inputYaml = ``;
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
        [
          {
            range: new monaco.Range(1, 1, 1, 1),
            text: expectedSnippet,
          },
        ],
        expect.any(Function)
      );
    });
  });
});
