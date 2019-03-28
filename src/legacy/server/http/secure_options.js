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

import crypto from 'crypto';
import { chain } from 'lodash';

const protocolMap = {
  TLSv1: crypto.constants.SSL_OP_NO_TLSv1,
  'TLSv1.1': crypto.constants.SSL_OP_NO_TLSv1_1,
  'TLSv1.2': crypto.constants.SSL_OP_NO_TLSv1_2
};

export default function (supportedProtocols) {
  if (!supportedProtocols || !supportedProtocols.length) {
    return null;
  }

  return chain(protocolMap)
    .omit(supportedProtocols)
    .values()
    .reduce(function (value, sum) {
      return value | sum;
    }, 0)
    .value();
}
