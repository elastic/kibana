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

import { copyField } from '../copy_field';

const field = {
  name: 'test_field',
  scripted: true,
  type: 'number',
  lang: 'painless',
};

describe('copyField', () => {
  it('should copy a field', () => {
    const copiedField = copyField(field, {}, {});
    copiedField.name = 'test_name_change';

    // Check that copied field has `toActualField()` method
    expect(typeof copiedField.toActualField).toEqual('function');

    // Check that we did not modify the original field object when
    // modifying copied field
    expect(field.toActualField).toEqual(undefined);
    expect(field.name).toEqual('test_field');

    expect(copiedField).not.toEqual(field);
    expect(copiedField.name).toEqual('test_name_change');
    expect(copiedField.scripted).toEqual(field.scripted);
    expect(copiedField.type).toEqual(field.type);
    expect(copiedField.lang).toEqual(field.lang);
  });
});
