/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isScalar, parseDocument } from 'yaml';
import { QuerySuggestionTypes } from '@kbn/kql/public';
import { monaco } from '@kbn/monaco';
import {
  buildKqlMonacoFilterText,
  getTriggerConditionKqlSpan,
  isKqlMonacoSuggestionRangeValid,
  mapQuerySuggestionsToMonaco,
  resolveKqlSelectionAfterFieldColon,
} from './get_trigger_condition_kql_suggestions';

const CONDITION_PATH = ['triggers', 0, 'on', 'condition'] as const;

describe('getTriggerConditionKqlSpan', () => {
  it('uses the live editor slice for KQL when parsed scalar value lags (e.g. trailing space)', () => {
    const documentText = `triggers:
  - type: manual
    on:
      condition: 'event.category: * and '
`;
    const yamlDocument = parseDocument(documentText);
    const node = yamlDocument.getIn([...CONDITION_PATH], true);
    expect(isScalar(node)).toBe(true);
    if (isScalar(node)) {
      node.value = 'event.category: * and';
    }

    const span = getTriggerConditionKqlSpan(yamlDocument, [...CONDITION_PATH], documentText);
    expect(span).not.toBeNull();
    expect(span!.kql).toBe('event.category: * and ');
    expect(documentText.slice(span!.contentStartInFile, span!.contentEndInFile)).toBe(
      'event.category: * and '
    );
  });
});

describe('isKqlMonacoSuggestionRangeValid', () => {
  it('is true when replacement offsets fall within the model from contentStartInFile', () => {
    expect(isKqlMonacoSuggestionRangeValid(100, 10, { start: 0, end: 5 })).toBe(true);
  });

  it('is false when start maps past the end of the model (suggestion dropped, no Monaco item)', () => {
    expect(isKqlMonacoSuggestionRangeValid(20, 10, { start: 15, end: 18 })).toBe(false);
  });

  it('is false when end is before start', () => {
    expect(isKqlMonacoSuggestionRangeValid(100, 10, { start: 5, end: 3 })).toBe(false);
  });

  it('is false when file offset is negative', () => {
    expect(isKqlMonacoSuggestionRangeValid(100, 5, { start: -10, end: 0 })).toBe(false);
  });
});

describe('buildKqlMonacoFilterText', () => {
  it('prefixes insertText with kql before caret for monaco fuzzy filter inside yaml strings', () => {
    const kql = 'event.category: * and ';
    expect(buildKqlMonacoFilterText(kql, kql.length, 'event.severity')).toBe(
      'event.category: * and event.severity'
    );
  });
});

describe('resolveKqlSelectionAfterFieldColon', () => {
  it('moves a collapsed selection from on top of trailing field colon to after it', () => {
    const kql = 'event.category:"help" and event.foo.bar.baz:';
    const colonIndex = kql.length - 1;
    expect(resolveKqlSelectionAfterFieldColon(kql, colonIndex, colonIndex)).toEqual({
      selectionStart: kql.length,
      selectionEnd: kql.length,
    });
  });

  it('does not move when the colon starts a value (non-whitespace follows)', () => {
    const kql = 'foo:bar';
    expect(resolveKqlSelectionAfterFieldColon(kql, 3, 3)).toEqual({
      selectionStart: 3,
      selectionEnd: 3,
    });
  });

  it('does not move when selection spans a range', () => {
    const kql = 'foo:';
    expect(resolveKqlSelectionAfterFieldColon(kql, 0, 4)).toEqual({
      selectionStart: 0,
      selectionEnd: 4,
    });
  });

  it('moves when only spaces follow the colon under the caret', () => {
    const kql = 'foo:   ';
    expect(resolveKqlSelectionAfterFieldColon(kql, 3, 3)).toEqual({
      selectionStart: 4,
      selectionEnd: 4,
    });
  });
});

describe('mapQuerySuggestionsToMonaco', () => {
  const createSingleLineModel = (content: string): monaco.editor.ITextModel => {
    return {
      getValueLength: () => content.length,
      getPositionAt: (offset: number) => new monaco.Position(1, offset + 1),
    } as monaco.editor.ITextModel;
  };

  it('builds completion items with filterText = kql prefix plus insertText', () => {
    const inner = 'event.category: * and ';
    const fileContent = `    condition: "${inner}"`;
    const contentStartInFile = fileContent.indexOf(inner);
    expect(contentStartInFile).toBeGreaterThan(-1);

    const model = createSingleLineModel(fileContent);
    const kqlSelectionStart = inner.length;
    const suggestions = [
      {
        type: QuerySuggestionTypes.Field,
        text: 'event.severity ',
        start: kqlSelectionStart,
        end: kqlSelectionStart,
        description: 'Field doc',
      },
    ];

    const items = mapQuerySuggestionsToMonaco(
      suggestions,
      model,
      contentStartInFile,
      inner,
      kqlSelectionStart
    );

    expect(items).toHaveLength(1);
    expect(items[0].insertText).toBe('event.severity');
    expect(items[0].filterText).toBe(`${inner}event.severity`);
    expect(items[0].documentation).toEqual({ value: 'Field doc' });
  });
});
