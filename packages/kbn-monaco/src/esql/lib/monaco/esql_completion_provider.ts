/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../monaco_imports';
import { DynamicAutocompleteItem, isDynamicAutocompleteItem } from '../autocomplete/dymanic_item';
import {
  buildFieldsDefinitions,
  buildSourcesDefinitions,
} from '../autocomplete/autocomplete_definitions/dynamic_commands';

import type {
  AutocompleteCommandDefinition,
  ESQLCustomAutocompleteCallbacks,
  UserDefinedVariables,
} from '../autocomplete/types';
import type { ESQLWorker } from '../../worker/esql_worker';

export class ESQLCompletionAdapter implements monaco.languages.CompletionItemProvider {
  constructor(
    private worker: (...uris: monaco.Uri[]) => Promise<ESQLWorker>,
    private callbacks?: ESQLCustomAutocompleteCallbacks
  ) {}

  public triggerCharacters = ['(', ' ', ''];

  private async injectDynamicAutocompleteItems(
    suggestions: Array<AutocompleteCommandDefinition | DynamicAutocompleteItem>,
    ctx: {
      word: string;
      userDefinedVariables: UserDefinedVariables;
    }
  ): Promise<AutocompleteCommandDefinition[]> {
    let result: AutocompleteCommandDefinition[] = [];

    for (const suggestion of suggestions) {
      if (isDynamicAutocompleteItem(suggestion)) {
        let dynamicItems: AutocompleteCommandDefinition[] = [];

        if (suggestion === DynamicAutocompleteItem.SourceIdentifier) {
          dynamicItems = buildSourcesDefinitions(
            (await this.callbacks?.getSourceIdentifiers?.(ctx)) ?? []
          );
        }

        if (suggestion === DynamicAutocompleteItem.FieldIdentifier) {
          dynamicItems = buildFieldsDefinitions(
            (await this.callbacks?.getFieldsIdentifiers?.(ctx)) ?? []
          );
        }
        result = [...result, ...dynamicItems];
      } else {
        result = [...result, suggestion];
      }
    }

    return result;
  }

  async provideCompletionItems(
    model: monaco.editor.IReadOnlyModel,
    position: monaco.Position
  ): Promise<monaco.languages.CompletionList> {
    const lines = model.getLineCount();

    const currentLineChars = model.getValueInRange({
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });
    const wordInfo = model.getWordUntilPosition(position);
    const worker = await this.worker(model.uri);
    const providedSuggestions =
      lines !== position.lineNumber ||
      model.getLineContent(position.lineNumber).trimEnd().length >= position.column
        ? await worker.provideAutocompleteSuggestionsFromString(currentLineChars)
        : await worker.provideAutocompleteSuggestions(model.uri.toString(), {
            word: wordInfo.word,
            line: position.lineNumber,
            index: position.column,
          });

    const withDynamicItems = providedSuggestions
      ? await this.injectDynamicAutocompleteItems(providedSuggestions.suggestions, {
          word: wordInfo.word,
          userDefinedVariables: providedSuggestions.userDefinedVariables,
        })
      : [];

    return {
      incomplete: true,
      suggestions: withDynamicItems.map((i) => ({
        ...i,
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn,
        },
      })),
    };
  }
}
