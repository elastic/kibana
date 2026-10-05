/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { TimelionExpressionArgument } from '../../common/parser';
import { getArgValueSuggestions, type ArgValueSuggestions } from './arg_value_suggestions';
import { setIndexPatterns } from './plugin_services';

describe('getArgValueSuggestions', () => {
  const get = jest.fn(async (id: string) => {
    if (id === 'logstash') {
      return createDataView([
        { name: '@timestamp', type: KBN_FIELD_TYPES.DATE },
        { name: 'bytes', type: KBN_FIELD_TYPES.NUMBER },
        { name: '@message.raw', type: KBN_FIELD_TYPES.STRING },
      ]);
    }
    return createDataView([{ name: 'rolled_up_timestamp', type: KBN_FIELD_TYPES.DATE }]);
  });
  const getIdsWithTitle = jest.fn(async () => [
    { id: 'long-window', title: 'long-window-logstash-*' },
    { id: 'logstash', title: 'logstash-*' },
  ]);
  const find = jest.fn();

  let argValueSuggestions: ArgValueSuggestions;
  const indexArg = {
    name: 'index',
    value: { text: 'logstash-*' },
  } as TimelionExpressionArgument;

  beforeEach(() => {
    get.mockClear();
    getIdsWithTitle.mockClear();
    find.mockClear();
    setIndexPatterns({
      get,
      getIdsWithTitle,
      find,
    } as unknown as DataViewsContract);
    argValueSuggestions = getArgValueSuggestions();
  });

  it('resolves timefield suggestions from the data view with the exact title', async () => {
    const suggestions = await argValueSuggestions.getDynamicSuggestionsForArgument(
      'es',
      'timefield',
      [indexArg]
    );

    expect(find).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith('logstash');
    expect(suggestions).toEqual([{ name: '@timestamp', insertText: '@timestamp' }]);
  });

  it('resolves split and metric suggestions from that same data view', async () => {
    const splitSuggestions = await argValueSuggestions.getDynamicSuggestionsForArgument(
      'es',
      'split',
      [indexArg]
    );
    const metricSuggestions = await argValueSuggestions.getDynamicSuggestionsForArgument(
      'es',
      'metric',
      [indexArg],
      'avg:'
    );

    expect(splitSuggestions.map(({ name }: { name: string }) => name)).toEqual([
      '@timestamp',
      'bytes',
      '@message.raw',
    ]);
    expect(metricSuggestions).toEqual([
      { name: 'avg:bytes', help: KBN_FIELD_TYPES.NUMBER, insertText: 'bytes' },
    ]);
    expect(get).toHaveBeenCalledWith('logstash');
  });

  it('returns no field suggestions when no data view title matches exactly', async () => {
    const suggestions = await argValueSuggestions.getDynamicSuggestionsForArgument(
      'es',
      'timefield',
      [{ name: 'index', value: { text: 'missing-*' } } as TimelionExpressionArgument]
    );

    expect(suggestions).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});

function createDataView(fields: Array<{ name: string; type: string }>) {
  const allFields = fields.map((field) => ({
    name: field.name,
    type: field.type,
    aggregatable: true,
  }));

  return {
    fields: {
      getByType: (type: string) => allFields.filter((field) => field.type === type),
      getAll: () => allFields,
    },
  };
}
