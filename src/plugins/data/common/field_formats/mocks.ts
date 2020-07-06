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

import { identity } from 'lodash';
import { FieldFormat, IFieldFormatsRegistry } from '.';

export const fieldFormatsMock: IFieldFormatsRegistry = {
  getByFieldType: jest.fn(),
  getDefaultConfig: jest.fn(),
  getDefaultInstance: jest.fn().mockImplementation(() => ({
    getConverterFor: jest.fn().mockImplementation(() => (t: string) => t),
  })) as any,
  getDefaultInstanceCacheResolver: jest.fn(),
  getDefaultInstancePlain: jest.fn(),
  getDefaultType: jest.fn(),
  getDefaultTypeName: jest.fn(),
  getInstance: jest.fn() as any,
  getType: jest.fn(),
  getTypeNameByEsTypes: jest.fn(),
  init: jest.fn(),
  register: jest.fn(),
  parseDefaultTypeMap: jest.fn(),
  deserialize: jest.fn().mockImplementation(() => {
    const DefaultFieldFormat = FieldFormat.from(identity);
    return new DefaultFieldFormat();
  }),
  getTypeWithoutMetaParams: jest.fn(),
};
