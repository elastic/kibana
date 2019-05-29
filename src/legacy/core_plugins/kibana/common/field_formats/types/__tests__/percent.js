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
import { createPercentFormat } from '../percent';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const PercentFormat = createPercentFormat(FieldFormat);

describe('PercentFormat', function () {

  const config = {};
  config['format:percent:defaultPattern'] = '0,0.[000]%';
  const getConfig = (key) => config[key];

  it('default pattern', ()=> {
    const formatter = new PercentFormat({}, getConfig);
    expect(formatter.convert(0.99999)).to.be('99.999%');
  });

  it('custom pattern', ()=> {
    const formatter = new PercentFormat({ pattern: '0,0%' }, getConfig);
    expect(formatter.convert('0.99999')).to.be('100%');
  });

});
