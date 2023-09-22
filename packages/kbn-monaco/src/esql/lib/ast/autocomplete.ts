/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { monaco } from '../../../monaco_imports';
import { buildSourcesDefinitions } from '../autocomplete/autocomplete_definitions';
import {
  getCompatibleMathCommandDefinition,
  mathCommandDefinition,
} from '../autocomplete/autocomplete_definitions/functions_commands';
import {
  AutocompleteCommandDefinition,
  ESQLCustomAutocompleteCallbacks,
} from '../autocomplete/types';
import { getFunctionDefinition, monacoPositionToOffset } from './helpers';

export async function suggest(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.CompletionContext,
  resourceRetriever?: ESQLCustomAutocompleteCallbacks
): Promise<{
  suggestions: monaco.languages.CompletionItem[];
}> {
  const innerText = model.getValue();
  const offset = monacoPositionToOffset(innerText, position);

  let aSuggestions: AutocompleteCommandDefinition[] = [];
  if (context.triggerCharacter === '(') {
    // Monaco usually inserts the end quote and reports the position is after the end quote
    if (innerText.slice(offset - 1, offset + 1) === '()') {
      position = position.delta(0, -1);
    }
    const wordUntil = model.getWordAtPosition(position.delta(0, -3));
    if (wordUntil) {
      // Retrieve suggestions for functions
      aSuggestions = await getFunctionArgsSuggestions(
        model,
        position,
        wordUntil,
        resourceRetriever
      );
    }
  }
  if (context.triggerCharacter === ',') {
    aSuggestions = await getIdentifierSuggestions();
  }

  return {
    suggestions: aSuggestions.map((suggestion) => ({
      ...suggestion,
      range: undefined as unknown as monaco.IRange,
    })),
  };
}

async function getFunctionArgsSuggestions(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  fnName: monaco.editor.IWordAtPosition,
  resourceRetriever?: ESQLCustomAutocompleteCallbacks
): Promise<AutocompleteCommandDefinition[]> {
  const fnDefinition = getFunctionDefinition(fnName.word);
  if (fnDefinition) {
    // this is the first argument
    const types = fnDefinition.signatures.flatMap((signature) => signature.params[0].type);
    const fieldsOfType = await resourceRetriever?.getFields?.({
      word: fnName.word,
      variables: { userDefined: [], policies: [] },
    });
    const filteredFieldsByType = fieldsOfType
      ?.filter(({ type }) => {
        const ts = Array.isArray(type) ? type : [type];
        return ts.some((t) => types.includes(t));
      })
      .map(({ name }) => name);
    return buildSourcesDefinitions(filteredFieldsByType || []).concat(
      getCompatibleMathCommandDefinition(types)
    );
  }
  return mathCommandDefinition;
}

async function getIdentifierSuggestions() {
  return [];
}
