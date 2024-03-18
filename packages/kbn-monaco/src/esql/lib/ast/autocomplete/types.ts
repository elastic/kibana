/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../../..';

/** @internal **/
export interface UserDefinedVariables {
  userDefined: string[];
  policies: string[];
}

/** @internal **/
export type AutocompleteCommandDefinition = Pick<
  monaco.languages.CompletionItem,
  | 'label'
  | 'insertText'
  | 'kind'
  | 'detail'
  | 'documentation'
  | 'sortText'
  | 'insertTextRules'
  | 'command'
>;
