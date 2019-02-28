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

import secureOptions from './secure_options';
import crypto from 'crypto';

const constants = crypto.constants;

describe('secure_options', function () {
  it('allows null', function () {
    expect(secureOptions(null)).toBe(null);
  });

  it ('allows an empty array', function () {
    expect(secureOptions([])).toBe(null);
  });

  it ('removes TLSv1 if we only support TLSv1.1 and TLSv1.2', function () {
    expect(secureOptions(['TLSv1.1', 'TLSv1.2'])).toBe(constants.SSL_OP_NO_TLSv1);
  });

  it ('removes TLSv1.1 and TLSv1.2 if we only support TLSv1', function () {
    expect(secureOptions(['TLSv1'])).toBe(constants.SSL_OP_NO_TLSv1_1 | constants.SSL_OP_NO_TLSv1_2);
  });

  it ('removes TLSv1 and TLSv1.1 if we only support TLSv1.2', function () {
    expect(secureOptions(['TLSv1.2'])).toBe(constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1);
  });

});
