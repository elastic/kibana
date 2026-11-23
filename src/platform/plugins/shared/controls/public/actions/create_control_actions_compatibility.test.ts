/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableField, FilterableSource } from '@kbn/data-source';
import { createOptionsListControlAction } from './create_options_list_action';
import { createRangeSliderControlAction } from './create_range_slider_action';

describe('compatibility of the control types with a field', () => {
  const numberField: FilterableField = { name: 'bytes', type: 'number', aggregatable: true };
  const esqlSource: FilterableSource = {
    kind: 'esql',
    id: 'esql-dataset-id',
    title: 'logs-*',
    fields: [numberField],
    getFieldByName: (name) => (name === 'bytes' ? numberField : undefined),
    isTimeBased: () => false,
  };

  it.each([
    ['options list', createOptionsListControlAction()],
    ['range slider', createRangeSliderControlAction()],
  ])('the %s is compatible with a field of the source', async (_, action) => {
    const context = { state: { field_name: 'bytes' }, source: esqlSource };

    expect(await action.isCompatible(context as never)).toBe(true);
    expect(
      await action.isCompatible({ ...context, state: { field_name: 'missing' } } as never)
    ).toBe(false);
  });

  it.each([
    ['options list', createOptionsListControlAction()],
    ['range slider', createRangeSliderControlAction()],
  ])('the %s is not compatible without a field or without a source', async (_, action) => {
    expect(await action.isCompatible({ state: {}, source: esqlSource } as never)).toBe(false);
    expect(await action.isCompatible({ state: { field_name: 'bytes' } } as never)).toBe(false);
  });
});
