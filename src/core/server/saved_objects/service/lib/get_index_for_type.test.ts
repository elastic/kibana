/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getIndexForType } from './get_index_for_type';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';

describe('getIndexForType', () => {
  const kibanaVersion = '8.0.0';
  const defaultIndex = '.kibana';
  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;

  beforeEach(() => {
    typeRegistry = typeRegistryMock.create();
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
