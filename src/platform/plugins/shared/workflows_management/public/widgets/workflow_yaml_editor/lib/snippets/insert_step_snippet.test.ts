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
import * as generateBuiltInStepSnippetModule from './generate_builtin_step_snippet';
import * as generateConnectorSnippetModule from './generate_connector_snippet';
import { insertStepSnippet } from './insert_step_snippet';
import { createFakeMonacoModel } from '../../../../../common/mocks/monaco_model';
import { prependIndentToLines } from '../prepend_indent_to_lines';

describe('insertStepSnippet', () => {
  let generateBuiltInStepSnippetSpy: jest.SpyInstance;
  let generateConnectorSnippetSpy: jest.SpyInstance;
  beforeEach(() => {
    generateBuiltInStepSnippetSpy = jest.spyOn(
      generateBuiltInStepSnippetModule,
      'generateBuiltInStepSnippet'
    );
    generateConnectorSnippetSpy = jest.spyOn(
      generateConnectorSnippetModule,
      'generateConnectorSnippet'
    );
    jest.clearAllMocks();
  });

  it('should insert the "steps:" section if it does not exist', () => {
    const inputYaml = `name: one_step_workflow`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');
    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: true,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: true,
    });
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          // we expect the snippet to be inserted at the second line
          range: new monaco.Range(2, 1, 2, 1),
          text: snippetText,
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
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');
    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          // we expect the snippet to be inserted at the seventh line after the last step
          range: new monaco.Range(7, 1, 7, 1),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });
  it('should insert a step snippet after the step at which cursor is', () => {
    const inputYaml = `name: nested_step_workflow
steps:
  - name: loop
    type: foreach
    foreach: "{{ context.items }}"
    steps:
      - name: get_google
        type: http
        with:
          url: https://google.com # <- cursor is here`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');
    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(11, 1, 11, 1),
          // since the last step is in a nested step, it should have 6 spaces of indent
          text: prependIndentToLines(snippetText, 6),
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
          url: https://google.com # <- cursor is here
      - name: log_result
        type: console
        with:
          message: "{{ steps.get_google.output|json }}"
`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(10, 33)
    );
    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Cursor is between the two nested steps (line 10); new step inserts after the first, so at line 12 with nested indent (6).
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(12, 1, 12, 1),
          text: prependIndentToLines(snippetText, 6),
        },
      ],
      expect.any(Function)
    );
  });

  it('should insert connector snippet if step type is not a built-in', () => {
    const inputYaml = `name: one_step_workflow
steps:
  - name: get_google
    type: http
    with:
      url: https://google.com`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'dynamic_connector'
    );
    expect(generateConnectorSnippetSpy).toHaveBeenCalledWith('dynamic_connector', {
      full: true,
      withStepsSection: false,
    });
  });

  it('should call pushUndoStop when editor is provided', () => {
    const inputYaml = `name: one_step_workflow`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    const mockEditor = {
      pushUndoStop: jest.fn(),
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      undefined,
      mockEditor
    );

    expect(mockEditor.pushUndoStop).toHaveBeenCalledTimes(2);
  });

  it('should insert step when YAML is empty', () => {
    const inputYaml = ``;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: true,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: true,
    });

    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(2, 1, 2, 1),
          text: snippetText,
        },
      ],
      expect.any(Function)
    );
  });

  it('should insert step when steps section exists but is empty (steps:)', () => {
    const inputYaml = `steps:`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(2, 1, 2, 1),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should replace flow-style empty array (steps: [])', () => {
    const inputYaml = `steps: []`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    const expectedText = `steps:\n${prependIndentToLines(snippetText, 2)}`;
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: expectedText,
        },
      ],
      expect.any(Function)
    );
  });

  it('should replace empty item (steps:\\n  -)', () => {
    const inputYaml = `steps:
  -`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Should replace the empty - with the step
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should insert step after comment when steps has trailing spaces', () => {
    const inputYaml = `steps:      
  ### comment
  - name: existing_step
    type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Should insert after the comment, before existing_step
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should replace empty line when cursor is on empty line between comment and step', () => {
    const inputYaml = `steps:
  ### hello world
  
  - name: existing_step
    type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is on the empty line between comment and step (line 3)
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(3, 1)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Should replace the empty line (line 3) with the step
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should insert step at cursor position when cursor is on steps: line', () => {
    const inputYaml = `steps:
  ## Hello
  - name: existing_step
    type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is on the steps: line
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(1, 7)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });

    expect(model.pushEditOperations).toHaveBeenCalled();
    const callArgs = (model.pushEditOperations as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toBe(null);
    expect(callArgs[1]).toHaveLength(1);
    expect(callArgs[1][0].range).toBeInstanceOf(monaco.Range);
    // Normalize the expected text (remove any existing trailing newlines) and add the comment line
    let expectedTextWithoutNewline = prependIndentToLines(snippetText, 2);
    // Remove trailing newlines without regex
    while (
      expectedTextWithoutNewline.length > 0 &&
      expectedTextWithoutNewline[expectedTextWithoutNewline.length - 1] === '\n'
    ) {
      expectedTextWithoutNewline = expectedTextWithoutNewline.slice(0, -1);
    }
    // The insertion includes the comment line to preserve it
    const expectedText = `${expectedTextWithoutNewline}\n  ## Hello\n`;
    expect(callArgs[1][0].text).toBe(expectedText);
    expect(callArgs[2]).toBeInstanceOf(Function);
  });

  it('should insert step at end when cursor is at end of last step', () => {
    const inputYaml = `steps:
  - name: first_step
    type: http
    with:
      url: https://example.com`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is at the end of the last step
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(5, 30)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Should insert after the last step
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should insert step on the newline after a step with root indent', () => {
    const inputYaml = `steps:
  - name: first_step
    type: http
    with:
      url: https://example.com

`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is on the empty line (line 6) after the last step
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(6, 1)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    const callArgs = (model.pushEditOperations as jest.Mock).mock.calls[0];
    expect(callArgs[1][0].range.startLineNumber).toBe(6);
    expect(callArgs[1][0].range.startColumn).toBe(1);
    expect(callArgs[1][0].text).toBe(prependIndentToLines(snippetText, 2));
  });

  it('should insert step on next line with root indent when cursor is on steps: line', () => {
    const inputYaml = `steps:
  - name: first_step
    type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is on the "steps:" line (line 1)
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(1, 3)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    const callArgs = (model.pushEditOperations as jest.Mock).mock.calls[0];
    // Should insert on line 2 (next line after "steps:")
    expect(callArgs[1][0].range.startLineNumber).toBe(2);
    expect(callArgs[1][0].range.startColumn).toBe(1);
    expect(callArgs[1][0].text).toContain(prependIndentToLines(snippetText, 2).trim());
  });

  it('should insert step on following line when cursor is on comment line', () => {
    const inputYaml = `steps:
  ## Hello world
  - name: existing_step
    type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is on the comment line
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(2, 5)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Should insert on the following line (line 3), before existing_step
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should replace empty line when cursor is on empty line', () => {
    const inputYaml = `steps:
  
  - name: existing_step
    type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is on the empty line (line 2)
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(2, 1)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Should replace the empty line (line 2) with the step
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should replace empty line at end of steps section when cursor is on it', () => {
    const inputYaml = `steps:
  - name: existing_step
    type: http
  
`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is on the empty line at the end (line 4)
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(4, 1)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Should replace the empty line (line 4) with the step
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should replace empty line right after steps: when cursor is on it', () => {
    const inputYaml = `steps:
  
  - name: existing_step
    type: http`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    // Cursor is on the empty line right after steps: (line 2)
    insertStepSnippet(
      model as unknown as monaco.editor.ITextModel,
      yamlDocument,
      'http',
      new monaco.Position(2, 1)
    );

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });
    // Should replace the empty line (line 2) with the step
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: prependIndentToLines(snippetText, 2),
        },
      ],
      expect.any(Function)
    );
  });

  it('should handle steps with trailing spaces and comments', () => {
    const inputYaml = `steps:      
  ### Hello world`;
    const model = createFakeMonacoModel(inputYaml);
    const yamlDocument = parseDocument(inputYaml);
    insertStepSnippet(model as unknown as monaco.editor.ITextModel, yamlDocument, 'http');

    expect(generateBuiltInStepSnippetSpy).toHaveBeenCalledWith('http', {
      full: true,
      withStepsSection: false,
    });

    const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
      full: true,
      withStepsSection: false,
    });

    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: expect.any(monaco.Range),
          text: `\n${prependIndentToLines(snippetText, 2)}`,
        },
      ],
      expect.any(Function)
    );
  });

  describe('nested steps indent', () => {
    it('should use nested foreach steps indent when inserting inside foreach steps block', () => {
      const inputYaml = `steps:
  - name: loop
    type: foreach
    foreach: "{{ x }}"
    steps:
      - name: inner
        type: console`;
      const model = createFakeMonacoModel(inputYaml);
      const yamlDocument = parseDocument(inputYaml);
      // Cursor on empty line after inner step (line 8)
      insertStepSnippet(
        model as unknown as monaco.editor.ITextModel,
        yamlDocument,
        'http',
        new monaco.Position(8, 1)
      );

      const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
        full: true,
        withStepsSection: false,
      });
      // Foreach steps: key at 4 spaces, so step indent 6
      expect(model.pushEditOperations).toHaveBeenCalledWith(
        null,
        [
          {
            range: expect.any(monaco.Range),
            text: prependIndentToLines(snippetText, 6),
          },
        ],
        expect.any(Function)
      );
    });

    it('should use nested if steps indent when inserting inside if step block', () => {
      const inputYaml = `steps:
  - name: check
    type: if
    condition: "x"
    steps:
      - name: then_step
        type: console`;
      const model = createFakeMonacoModel(inputYaml);
      const yamlDocument = parseDocument(inputYaml);
      // Cursor on empty line after then_step (line 8)
      insertStepSnippet(
        model as unknown as monaco.editor.ITextModel,
        yamlDocument,
        'http',
        new monaco.Position(8, 1)
      );

      const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
        full: true,
        withStepsSection: false,
      });
      // If steps: key at 4 spaces, so step indent 6
      expect(model.pushEditOperations).toHaveBeenCalledWith(
        null,
        [
          {
            range: expect.any(monaco.Range),
            text: prependIndentToLines(snippetText, 6),
          },
        ],
        expect.any(Function)
      );
    });

    it('should use nested if steps indent when inserting inside foreach then if step block', () => {
      const inputYaml = `steps:
  - name: loop
    type: foreach
    foreach: "{{ x }}"
    steps:
      - name: check
        type: if
        condition: "x"
        steps:
          - name: then_step
            type: console`;
      const model = createFakeMonacoModel(inputYaml);
      const yamlDocument = parseDocument(inputYaml);
      // Cursor on empty line after then_step (line 12), inside foreach -> if -> steps
      insertStepSnippet(
        model as unknown as monaco.editor.ITextModel,
        yamlDocument,
        'http',
        new monaco.Position(12, 1)
      );

      const snippetText = generateBuiltInStepSnippetModule.generateBuiltInStepSnippet('http', {
        full: true,
        withStepsSection: false,
      });
      // If steps: key at 8 spaces (inside foreach), so step indent 10
      expect(model.pushEditOperations).toHaveBeenCalledWith(
        null,
        [
          {
            range: expect.any(monaco.Range),
            text: prependIndentToLines(snippetText, 10),
          },
        ],
        expect.any(Function)
      );
    });
  });
});
