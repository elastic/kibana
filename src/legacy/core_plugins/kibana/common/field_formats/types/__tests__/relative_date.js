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
import moment from 'moment-timezone';
import { createRelativeDateFormat } from '../relative_date';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const RelativeDateFormat = createRelativeDateFormat(FieldFormat);

describe('Relative Date Format', function () {
  let convert;

  beforeEach(function () {
    const relativeDate = new RelativeDateFormat({});
    convert = relativeDate.convert.bind(relativeDate);
  });

  it('decoding an undefined or null date should return a "-"', function () {
    expect(convert(null)).to.be('-');
    expect(convert(undefined)).to.be('-');
  });

  it('decoding invalid date should echo invalid value', function () {
    expect(convert('not a valid date')).to.be('not a valid date');
  });

  it('should parse date values', function () {
    const val = '2017-08-13T20:24:09.904Z';
    expect(convert(val)).to.be(moment(val).fromNow());
  });
});
