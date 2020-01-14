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

import { extractTimeFields } from '../extract_time_fields';

describe('extractTimeFields', () => {
  it('should handle no date fields', () => {
    const fields = [{ type: 'text' }, { type: 'text' }];

    expect(extractTimeFields(fields)).toEqual([
      { display: `The indices which match this index pattern don't contain any time fields.` },
    ]);
  });

  it('should add extra options', () => {
    const fields = [{ type: 'date', name: '@timestamp' }];

    expect(extractTimeFields(fields)).toEqual([
      { display: '@timestamp', fieldName: '@timestamp' },
      { isDisabled: true, display: '───', fieldName: '' },
      { display: `I don't want to use the Time Filter`, fieldName: undefined },
    ]);
  });
});
