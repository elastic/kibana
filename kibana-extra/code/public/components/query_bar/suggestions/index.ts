/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './suggestions_provider';
export * from './symbol_suggestions_provider';
export * from './file_suggestions_provider';
export * from './repository_suggestions_provider';

export enum AutocompleteSuggestionType {
  SYMBOL = 'symbol',
  FILE = 'file',
  REPOSITORY = 'repository',
}

export interface AutocompleteSuggestion {
  description?: string;
  end: number;
  start: number;
  text: string;
  tokenType: string;
  selectUrl: string;
}

export interface AutocompleteSuggestionGroup {
  type: AutocompleteSuggestionType;
  total: number;
  hasMore: boolean;
  suggestions: AutocompleteSuggestion[];
}
