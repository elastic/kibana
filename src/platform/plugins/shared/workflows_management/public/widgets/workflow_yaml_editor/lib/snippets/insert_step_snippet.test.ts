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
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(11, 1, 11, 1),
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
});
