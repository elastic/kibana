/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Vis } from '../../visualizations/public';
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
