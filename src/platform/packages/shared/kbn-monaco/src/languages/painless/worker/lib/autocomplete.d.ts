/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PainlessCompletionResult,
  PainlessCompletionItem,
  PainlessContext,
  PainlessAutocompleteField,
} from '../../types';
export interface Suggestion extends PainlessCompletionItem {
  properties?: PainlessCompletionItem[];
  constructorDefinition?: PainlessCompletionItem;
}
export declare const getKeywords: () => PainlessCompletionItem[];
export declare const getTypeSuggestions: () => PainlessCompletionItem[];
export declare const getStaticSuggestions: ({
  suggestions,
  hasFields,
  isRuntimeContext,
}: {
  suggestions: Suggestion[];
  hasFields?: boolean;
  isRuntimeContext?: boolean;
}) => PainlessCompletionResult;
export declare const getClassMemberSuggestions: (
  suggestions: Suggestion[],
  className: string
) => PainlessCompletionResult;
export declare const getFieldSuggestions: (
  fields: PainlessAutocompleteField[]
) => PainlessCompletionResult;
export declare const getConstructorSuggestions: (
  suggestions: Suggestion[]
) => PainlessCompletionResult;
export declare const getAutocompleteSuggestions: (
  painlessContext: PainlessContext,
  words: string[],
  fields?: PainlessAutocompleteField[]
) => PainlessCompletionResult;
