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

import expect from 'expect.js';
import { createIpFormat } from '../ip';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const IpFormat = createIpFormat(FieldFormat);

describe('IP Address Format', function () {
  let ip;
  beforeEach(function () {
    ip = new IpFormat();
  });

  it('converts a value from a decimal to a string', function () {
    expect(ip.convert(1186489492)).to.be('70.184.100.148');
  });

  it('converts null and undefined to -',  function () {
    expect(ip.convert(null)).to.be('-');
    expect(ip.convert(undefined)).to.be('-');
  });

});
