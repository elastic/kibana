/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SuggestionRawDefinition } from '@kbn/esql-validation-autocomplete';
import { monaco } from '../../monaco_imports';

export type MonacoAutocompleteCommandDefinition = Pick<
  monaco.languages.CompletionItem,
  | 'label'
  | 'insertText'
  | 'filterText'
  | 'kind'
  | 'detail'
  | 'documentation'
  | 'sortText'
  | 'insertTextRules'
  | 'command'
> & { range?: monaco.IRange };

export type MonacoCodeAction = monaco.languages.CodeAction;

export type SuggestionRawDefinitionWithMonacoRange = Omit<
  SuggestionRawDefinition,
  'rangeToReplace'
> & {
  range?: monaco.IRange;
};
