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

export interface Operator {
  id: string;
  defaultMessage: string;
  type: string;
  negate: boolean;
  fieldTypes?: string[];
}

export const FILTER_OPERATORS: Operator[] = [
  {
    id: 'isOperator',
    defaultMessage: 'is',
    type: 'phrase',
    negate: false,
  },
  {
    id: 'isNotOperator',
    defaultMessage: 'is not',
    type: 'phrase',
    negate: true,
  },
  {
    id: 'isOneOfOperator',
    defaultMessage: 'is one of',
    type: 'phrases',
    negate: false,
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  },
  {
    id: 'isNotOneOfOperator',
    defaultMessage: 'is not one of',
    type: 'phrases',
    negate: true,
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
  },
  {
    id: 'isBetweenOperator',
    defaultMessage: 'is between',
    type: 'range',
    negate: false,
    fieldTypes: ['number', 'date', 'ip'],
  },
  {
    id: 'isNotBetweenOperator',
    defaultMessage: 'is not between',
    type: 'range',
    negate: true,
    fieldTypes: ['number', 'date', 'ip'],
  },
  {
    id: 'existsOperator',
    defaultMessage: 'exists',
    type: 'exists',
    negate: false,
  },
  {
    id: 'doesNotExistOperator',
    defaultMessage: 'does not exist',
    type: 'exists',
    negate: true,
  },
];
