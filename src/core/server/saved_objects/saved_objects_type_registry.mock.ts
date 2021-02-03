/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ISavedObjectTypeRegistry, SavedObjectTypeRegistry } from './saved_objects_type_registry';

const createRegistryMock = (): jest.Mocked<
  ISavedObjectTypeRegistry & Pick<SavedObjectTypeRegistry, 'registerType'>
> => {
  const mock = {
    registerType: jest.fn(),
    getType: jest.fn(),
    getVisibleTypes: jest.fn(),
    getAllTypes: jest.fn(),
    getImportableAndExportableTypes: jest.fn(),
    isNamespaceAgnostic: jest.fn(),
    isSingleNamespace: jest.fn(),
    isMultiNamespace: jest.fn(),
    isHidden: jest.fn(),
    getIndex: jest.fn(),
    isImportableAndExportable: jest.fn(),
  };

  mock.getVisibleTypes.mockReturnValue([]);
  mock.getAllTypes.mockReturnValue([]);
  mock.getImportableAndExportableTypes.mockReturnValue([]);
  mock.getIndex.mockReturnValue('.kibana-test');
  mock.getIndex.mockReturnValue('.kibana-test');
  mock.isHidden.mockReturnValue(false);
  mock.isNamespaceAgnostic.mockImplementation((type: string) => type === 'global');
  mock.isSingleNamespace.mockImplementation(
    (type: string) => type !== 'global' && type !== 'shared'
  );
  mock.isMultiNamespace.mockImplementation((type: string) => type === 'shared');
  mock.isImportableAndExportable.mockReturnValue(true);

  return mock;
};

export const typeRegistryMock = {
  create: createRegistryMock,
};
