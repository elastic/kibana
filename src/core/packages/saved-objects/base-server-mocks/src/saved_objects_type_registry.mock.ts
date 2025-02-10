/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';

const createRegistryMock = (): jest.Mocked<
  ISavedObjectTypeRegistry & Pick<SavedObjectTypeRegistry, 'registerType'>
> => {
  const mock = {
    registerType: jest.fn(),
    getType: jest.fn(),
    getVisibleTypes: jest.fn(),
    getVisibleToHttpApisTypes: jest.fn(),
    getAllTypes: jest.fn(),
    getImportableAndExportableTypes: jest.fn(),
    isNamespaceAgnostic: jest.fn(),
    isSingleNamespace: jest.fn(),
    isMultiNamespace: jest.fn(),
    isShareable: jest.fn(),
    isHidden: jest.fn(),
    isHiddenFromHttpApis: jest.fn(),
    getIndex: jest.fn(),
    isImportableAndExportable: jest.fn(),
    getNameAttribute: jest.fn(),
  };

  mock.getVisibleTypes.mockReturnValue([]);
  mock.getAllTypes.mockReturnValue([]);
  mock.getImportableAndExportableTypes.mockReturnValue([]);
  mock.getIndex.mockReturnValue('.kibana-test');
  mock.getIndex.mockReturnValue('.kibana-test');
  mock.isHidden.mockReturnValue(false);
  mock.isHiddenFromHttpApis.mockReturnValue(false);
  mock.isNamespaceAgnostic.mockImplementation((type: string) => type === 'global');
  mock.isSingleNamespace.mockImplementation(
    (type: string) => type !== 'global' && type !== 'shared'
  );
  mock.isMultiNamespace.mockImplementation((type: string) => type === 'shared');
  mock.isShareable.mockImplementation((type: string) => type === 'shared');
  mock.isImportableAndExportable.mockReturnValue(true);
  mock.getVisibleToHttpApisTypes.mockReturnValue(false);
  mock.getNameAttribute.mockReturnValue(undefined);

  return mock;
};

export const typeRegistryMock = {
  create: createRegistryMock,
};
