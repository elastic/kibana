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

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TopHitAgg } from './top_hit';
import { FIELDS, SERIES, PANEL, SCRIPTED_FIELD_VALUE } from '../../../../common/constants';
import { EuiComboBox } from '@elastic/eui';

describe('TopHitAgg', () => {
  const metric = {
    type: 'top_hit',
    field: SCRIPTED_FIELD_VALUE,
    script: 'doc["system.cpu.user.pct"].value * 100',
  };
  const series = { ...SERIES, metrics: [metric] };
  const panel = { ...PANEL, series };
  it('should populate "Aggregate with" for scripted aggregations', () => {
    const wrapper = mountWithIntl(
      <div>
        <TopHitAgg
          onAdd={jest.fn()}
          onChange={jest.fn()}
          onDelete={jest.fn()}
          panel={panel}
          fields={FIELDS}
          model={metric}
          series={series}
          siblings={series.metrics}
          dragHandleProps={{}}
        />
      </div>
    );
    expect(wrapper.find(EuiComboBox).at(2).props().options).toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "Avg",
          "value": "avg",
        },
        Object {
          "label": "Max",
          "value": "max",
        },
        Object {
          "label": "Min",
          "value": "min",
        },
        Object {
          "label": "Sum",
          "value": "sum",
        },
      ]
    `);
  });
});
