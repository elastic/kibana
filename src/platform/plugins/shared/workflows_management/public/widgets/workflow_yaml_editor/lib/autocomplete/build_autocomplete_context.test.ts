/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { buildAutocompleteContext } from './build_autocomplete_context';
import { createMockMonacoTextModel } from '../../../../../common/mocks/monaco_model';

describe('buildAutocompleteContext', () => {
  it('should return null if the yaml document is null', () => {
    const result = buildAutocompleteContext(
      {
        yamlString: '',
        computed: {
          yamlDocument: undefined,
          workflowLookup: undefined,
          workflowGraph: undefined,
          workflowDefinition: undefined,
        },
        focusedStepId: undefined,
        connectors: undefined,
      },
      createMockMonacoTextModel('', 0) as unknown as monaco.editor.ITextModel,
      new monaco.Position(1, 1),
      {
        triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
        triggerCharacter: '',
      } as monaco.languages.CompletionContext
    );
    expect(result).toEqual(null);
  });
});
