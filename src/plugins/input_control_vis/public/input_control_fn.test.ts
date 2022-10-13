/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createInputControlVisFn } from './input_control_fn';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';

describe('interpreter/functions#input_control_vis', () => {
  const fn = functionWrapper(createInputControlVisFn());
  const visConfig = {
    controls: [
      {
        id: '123',
        fieldName: 'geo.src',
        label: 'Source Country',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          size: 100,
          order: 'desc',
        },
        parent: '',
        indexPatternRefName: 'control_0_index_pattern',
      },
    ],
    updateFiltersOnChange: false,
    useTimeFilter: false,
    pinFilters: false,
  };

  test('returns an object with the correct structure', async () => {
    const actual = await fn(null, { visConfig: JSON.stringify(visConfig) });

    expect(actual).toMatchSnapshot();
  });
});
