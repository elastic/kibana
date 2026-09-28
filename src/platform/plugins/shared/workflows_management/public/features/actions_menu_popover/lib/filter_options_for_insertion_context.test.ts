/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filterOptionsForInsertionContext } from './filter_options_for_insertion_context';
import type { ActionOptionData } from '../types';
import { isActionGroup } from '../types';

describe('filterOptionsForInsertionContext', () => {
  const options: ActionOptionData[] = [
    {
      id: 'triggers',
      label: 'Triggers',
      iconType: 'bolt',
      options: [{ id: 'manual', label: 'Manual', iconType: 'play' }],
    },
    {
      id: 'elasticsearch',
      label: 'Elasticsearch',
      iconType: 'logoElasticsearch',
      options: [{ id: 'elasticsearch.search', label: 'Search', iconType: 'search' }],
    },
    {
      id: 'flowControl',
      label: 'Flow control',
      iconType: 'branch',
      options: [{ id: 'if', label: 'If', iconType: 'branch' }],
    },
  ];

  it('returns all options when context is undefined', () => {
    expect(filterOptionsForInsertionContext(options, undefined)).toEqual(options);
  });

  it('returns only trigger leaves for trigger mode', () => {
    const result = filterOptionsForInsertionContext(options, { mode: 'trigger' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('manual');
  });

  it('hides triggers for step mode but keeps flow control', () => {
    const result = filterOptionsForInsertionContext(options, { mode: 'step' });
    expect(result.map((o) => o.id)).toEqual(['elasticsearch', 'flowControl']);
  });

  it('hides triggers and flow control for error mode', () => {
    const result = filterOptionsForInsertionContext(options, { mode: 'error' });
    expect(result.map((o) => o.id)).toEqual(['elasticsearch']);
    expect(result.every((o) => isActionGroup(o) && o.options.length > 0)).toBe(true);
  });
});
