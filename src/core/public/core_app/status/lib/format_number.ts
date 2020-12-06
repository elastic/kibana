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

import numeral from '@elastic/numeral';

export type DataType = 'byte' | 'float' | 'integer' | 'time';

export function formatNumber(num: number, type?: DataType) {
  let format: string;
  let postfix = '';
  switch (type) {
    case 'byte':
      format = '0.00 b';
      break;
    case 'time':
      format = '0.00';
      postfix = ' ms';
      break;
    case 'integer':
      format = '0';
      break;
    case 'float':
    default:
      format = '0.00';
  }

  return numeral(num).format(format) + postfix;
}
