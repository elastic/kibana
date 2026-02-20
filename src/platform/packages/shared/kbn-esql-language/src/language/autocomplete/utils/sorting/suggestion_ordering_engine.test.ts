/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SuggestionOrderingEngine } from './suggestion_ordering_engine';
import { SuggestionCategory } from './types';
import type { ISuggestionItem } from '../../../../commands/registry/types';

describe('SuggestionOrderingEngine', () => {
  const engine = new SuggestionOrderingEngine();

  const createSuggestion = (label: string, category: SuggestionCategory): ISuggestionItem => ({
    label,
    text: label,
    kind: 'Keyword',
    detail: '',
    category,
  });

  it('should sort by priority then alphabetically', () => {
    const suggestions = [
      createSuggestion('zebra', SuggestionCategory.FIELD),
      createSuggestion('action', SuggestionCategory.CUSTOM_ACTION),
      createSuggestion('alpha', SuggestionCategory.FIELD),
      createSuggestion('operator', SuggestionCategory.OPERATOR),
    ];

    const result = engine.sort(suggestions, { command: 'EVAL' });

    expect(result[0].label).toBe('action');
    expect(result[1].label).toBe('alpha');
    expect(result[2].label).toBe('zebra');
    expect(result[3].label).toBe('operator');
  });

  it('should apply context-specific boosts (STATS BY)', () => {
    const suggestions = [
      createSuggestion('myColumn', SuggestionCategory.USER_DEFINED_COLUMN),
      createSuggestion('action', SuggestionCategory.CUSTOM_ACTION),
      createSuggestion('field', SuggestionCategory.FIELD),
    ];

    const result = engine.sort(suggestions, { command: 'STATS', location: 'BY' });

    expect(result[0].label).toBe('action');
    expect(result[1].label).toBe('myColumn');
    expect(result[2].label).toBe('field');
  });

  it('should change order based on context boost', () => {
    const suggestions = [
      createSuggestion('myColumn', SuggestionCategory.USER_DEFINED_COLUMN),
      createSuggestion('keyword', SuggestionCategory.LANGUAGE_KEYWORD),
    ];

    const evalResult = engine.sort([...suggestions], { command: 'EVAL' });
    expect(evalResult[0].label).toBe('keyword');
    expect(evalResult[1].label).toBe('myColumn');

    const statsByResult = engine.sort([...suggestions], { command: 'STATS', location: 'BY' });
    expect(statsByResult[0].label).toBe('myColumn');
    expect(statsByResult[1].label).toBe('keyword');
  });

  it('should boost aggregate functions in STATS context', () => {
    const suggestions = [
      createSuggestion('abs', SuggestionCategory.FUNCTION_SCALAR),
      createSuggestion('avg', SuggestionCategory.FUNCTION_AGG),
      createSuggestion('count', SuggestionCategory.FUNCTION_AGG),
    ];

    const evalResult = engine.sort([...suggestions], { command: 'EVAL' });
    expect(evalResult[0].label).toBe('abs');
    expect(evalResult[1].label).toBe('avg');
    expect(evalResult[2].label).toBe('count');

    const statsResult = engine.sort([...suggestions], { command: 'STATS' });
    expect(statsResult[0].label).toBe('avg');
    expect(statsResult[1].label).toBe('count');
    expect(statsResult[2].label).toBe('abs');
  });

  it('should sort LOOKUP_COMMON_FIELD first, then FIELD alphabetically', () => {
    const suggestions = [
      createSuggestion('sourceField', SuggestionCategory.FIELD),
      createSuggestion('lookupOnlyField', SuggestionCategory.FIELD),
      createSuggestion('commonField', SuggestionCategory.LOOKUP_COMMON_FIELD),
      createSuggestion('anotherSourceField', SuggestionCategory.FIELD),
    ];

    const result = engine.sort(suggestions, { command: 'JOIN' });

    expect(result[0].label).toBe('commonField');
    expect(result[1].label).toBe('anotherSourceField');
    expect(result[2].label).toBe('lookupOnlyField');
    expect(result[3].label).toBe('sourceField');
  });
});
