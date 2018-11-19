/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './suggestions_providers';
export * from './symbol_suggestions_providers';

export type AutocompleteSuggestionType = 'symbol' | 'file' | 'repository';

export interface AutocompleteSuggestion {
  description?: string;
  end: number;
  start: number;
  text: string;
  type: AutocompleteSuggestionType;
  selectUrl: string;
}
