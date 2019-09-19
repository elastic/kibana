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

import { FieldFormat } from '../../../../plugins/data/common/field_formats';
import { FieldFormatsService } from './field_formats_service';

// @ts-ignore
import { createNumberFormat } from '../../../core_plugins/kibana/common/field_formats/types/number';

const getConfig = (key: string) => {
  switch (key) {
    case 'format:defaultTypeMap':
      return {
        number: { id: 'number', params: {} },
        _default_: { id: 'string', params: {} },
      };
    case 'format:number:defaultPattern':
      return '0,0.[000]';
  }
};

describe('FieldFormatsService', function() {
  let fieldFormatsService: FieldFormatsService;

  beforeEach(function() {
    const fieldFormatClasses = [createNumberFormat(FieldFormat)];

    fieldFormatsService = new FieldFormatsService(fieldFormatClasses, getConfig);
  });

  test('FieldFormats are accessible via getType method', function() {
    const Type = fieldFormatsService.getType('number');

    expect(Type.id).toBe('number');
  });

  test('getDefaultInstance returns default FieldFormat instance for fieldType', function() {
    const instance = fieldFormatsService.getDefaultInstance('number');

    expect(instance.type.id).toBe('number');
    expect(instance.convert('0.33333')).toBe('0.333');
  });
});
