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

import expect from '@kbn/expect';
import { FieldFormat } from '../field_format';
import { FieldFormatsService } from '../field_formats_service';
import { createNumberFormat } from '../../../core_plugins/kibana/common/field_formats/types/number';

describe('FieldFormatsService', function () {

  const config = {};
  config['format:defaultTypeMap'] = {
    'number': { 'id': 'number', 'params': {} },
    '_default_': { 'id': 'string', 'params': {} }
  };
  config['format:number:defaultPattern'] = '0,0.[000]';
  const getConfig = (key) => config[key];
  const fieldFormatClasses = [createNumberFormat(FieldFormat)];

  let fieldFormats;
  beforeEach(function () {
    fieldFormats = new FieldFormatsService(fieldFormatClasses, getConfig);
  });

  it('FieldFormats are accessible via getType method', function () {
    const Type = fieldFormats.getType('number');
    expect(Type.id).to.be('number');
  });

  it('getDefaultInstance returns default FieldFormat instance for fieldType', function () {
    const instance = fieldFormats.getDefaultInstance('number', getConfig);
    expect(instance.type.id).to.be('number');
    expect(instance.convert('0.33333')).to.be('0.333');
  });

});
