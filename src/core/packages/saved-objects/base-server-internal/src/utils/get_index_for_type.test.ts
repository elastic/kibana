/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ISavedObjectTypeRegistry,
  MAIN_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import { getIndexForType } from './get_index_for_type';

const createTypeRegistry = () => {
  return {
    getIndex: jest.fn(),
  } as unknown as jest.Mocked<ISavedObjectTypeRegistry>;
};

describe('getIndexForType', () => {
  const kibanaVersion = '8.0.0';
  const defaultIndex = MAIN_SAVED_OBJECT_INDEX;
  let typeRegistry: ReturnType<typeof createTypeRegistry>;

  beforeEach(() => {
    typeRegistry = createTypeRegistry();
  });

  it('returns the correct index for a type specifying a custom index', () => {
    typeRegistry.getIndex.mockImplementation((type) => `.${type}-index`);
    expect(
      getIndexForType({
        type: 'foo',
        typeRegistry,
        defaultIndex,
        kibanaVersion,
      })
    ).toEqual('.foo-index_8.0.0');
  });

  it('returns the correct index for a type not specifying a custom index', () => {
    typeRegistry.getIndex.mockImplementation((type) => undefined);
    expect(
      getIndexForType({
        type: 'foo',
        typeRegistry,
        defaultIndex,
        kibanaVersion,
      })
    ).toEqual('.kibana_8.0.0');
  });
});
