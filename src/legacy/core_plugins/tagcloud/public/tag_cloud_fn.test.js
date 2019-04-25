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

import { functionWrapper } from '../../interpreter/test_helpers';
import { tagcloud } from './tag_cloud_fn';

describe('interpreter/functions#tagcloud', () => {
  const fn = functionWrapper(tagcloud);
  const context = {
    type: 'kibana_datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    scale: 'linear',
    orientation: 'single',
    minFontSize: 18,
    maxFontSize: 72,
    showLabel: true,
    metric: { accessor: 0, format: { id: 'number' } },
  };

  it('returns an object with the correct structure', () => {
    const actual = fn(context, visConfig);
    expect(actual).toMatchSnapshot();
  });
});
