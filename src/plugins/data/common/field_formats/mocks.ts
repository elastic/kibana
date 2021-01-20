/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { identity } from 'lodash';
import { FieldFormat, IFieldFormatsRegistry } from '.';

export const fieldFormatsMock: IFieldFormatsRegistry = {
  getByFieldType: jest.fn(),
  getDefaultConfig: jest.fn(),
  getDefaultInstance: jest.fn().mockImplementation(() => ({
    convert: jest.fn().mockImplementation((t: string) => t),
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
