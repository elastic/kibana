/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { getArgValueSuggestions } from './arg_value_suggestions';
import { setIndexPatterns } from './plugin_services';
import type { TimelionExpressionArgument } from '../../common/parser';

const location = { min: 0, max: 0 };

const indexArg = (title: string): TimelionExpressionArgument => ({
  name: 'index',
  function: 'es',
  type: 'namedArg',
  text: `index=${title}`,
  location,
  value: { type: 'literal', value: title, text: title, location },
});

describe('getArgValueSuggestions', () => {
  const get = jest.fn();

  beforeEach(() => {
    const fields = {
      getAll: () => [{ name: 'host', type: 'string', aggregatable: true }],
    };
    // logstash* ranks first, like the search tie seen in CI
    const dataViews = [
      { id: 'logstash-no-dash', title: 'logstash*', fields },
      { id: 'logstash-with-dash', title: 'logstash-*', fields },
    ];

    get.mockReset();
    get.mockImplementation(async (id: string) => dataViews.find((dataView) => dataView.id === id));
    setIndexPatterns({
      getIdsWithTitle: jest.fn().mockResolvedValue(dataViews),
      find: jest
        .fn()
        .mockImplementation(async (_search: string, size: number = 10) => dataViews.slice(0, size)),
      get,
    } as Partial<DataViewsContract> as DataViewsContract);
  });

  it('resolves the data view with the exact title when similar titles exist', async () => {
    const suggestions = await getArgValueSuggestions().getDynamicSuggestionsForArgument(
      'es',
      'split',
      [indexArg('logstash-*')]
    );

    expect(suggestions).toEqual([{ name: 'host', help: 'string', insertText: 'host' }]);
  });

  it('returns no suggestions when no data view has the exact title', async () => {
    const suggestions = await getArgValueSuggestions().getDynamicSuggestionsForArgument(
      'es',
      'split',
      [indexArg('logs-*')]
    );

    expect(get).not.toHaveBeenCalled();
    expect(suggestions).toEqual([]);
  });
});
