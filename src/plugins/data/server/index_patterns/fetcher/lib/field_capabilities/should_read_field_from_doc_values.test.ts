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

import { shouldReadFieldFromDocValues } from './should_read_field_from_doc_values';

describe('shouldReadFieldFromDocValues', () => {
  test('should read field from doc values for aggregatable "number" field', async () => {
    expect(shouldReadFieldFromDocValues(true, 'number')).toBe(true);
  });

  test('should not read field from doc values for non-aggregatable "number "field', async () => {
    expect(shouldReadFieldFromDocValues(false, 'number')).toBe(false);
  });

  test('should not read field from doc values for "text" field', async () => {
    expect(shouldReadFieldFromDocValues(true, 'text')).toBe(false);
  });

  test('should not read field from doc values for "geo_shape" field', async () => {
    expect(shouldReadFieldFromDocValues(true, 'geo_shape')).toBe(false);
  });

  test('should not read field from doc values for underscore field', async () => {
    expect(shouldReadFieldFromDocValues(true, '_source')).toBe(false);
  });
});
