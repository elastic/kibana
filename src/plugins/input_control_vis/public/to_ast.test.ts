/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { InputControlVisParams } from './types';
import { toExpressionAst } from './to_ast';

describe('input_control_vis toExpressionAst', () => {
  const vis = {
    params: {
      controls: [
        {
          id: '1536977437774',
          fieldName: 'manufacturer.keyword',
          parent: '',
          label: 'Manufacturer',
          type: 'list',
          options: {
            type: 'terms',
            multiselect: true,
            dynamicOptions: true,
            size: 5,
            order: 'desc',
          },
          indexPattern: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        },
      ],
      updateFiltersOnChange: false,
      useTimeFilter: true,
      pinFilters: false,
    },
  } as Vis<InputControlVisParams>;

  it('should build an expression based on vis.params', () => {
    const expression = toExpressionAst(vis);
    expect(expression).toMatchSnapshot();
  });
});
