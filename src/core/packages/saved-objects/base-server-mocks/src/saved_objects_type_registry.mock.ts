/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazyObject } from '@kbn/lazy-object';
import type { ISavedObjectTypeRegistryInternal } from '@kbn/core-saved-objects-base-server-internal';

const createRegistryMock = (): jest.Mocked<ISavedObjectTypeRegistryInternal> => {
  const mock = lazyObject({
    registerType: jest.fn(),
    getLegacyTypes: jest.fn().mockReturnValue([]),
    getType: jest.fn(),
    getVisibleTypes: jest.fn().mockReturnValue([]),
    getVisibleToHttpApisTypes: jest.fn().mockReturnValue(false),
    getAllTypes: jest.fn().mockReturnValue([]),
    getImportableAndExportableTypes: jest.fn().mockReturnValue([]),
    isNamespaceAgnostic: jest.fn().mockImplementation((type: string) => type === 'global'),
    isSingleNamespace: jest
      .fn()
      .mockImplementation((type: string) => type !== 'global' && type !== 'shared'),
    isMultiNamespace: jest.fn().mockImplementation((type: string) => type === 'shared'),
    isShareable: jest.fn().mockImplementation((type: string) => type === 'shared'),
    isHidden: jest.fn().mockReturnValue(false),
    isHiddenFromHttpApis: jest.fn(),
    getIndex: jest.fn(),
    isImportableAndExportable: jest.fn(),
    getNameAttribute: jest.fn(),
    supportsAccessControl: jest.fn(),
    isAccessControlEnabled: jest.fn(),
    setAccessControlEnabled: jest.fn(),
  });

  mock.getVisibleTypes.mockReturnValue([]);
  mock.getAllTypes.mockReturnValue([]);
  mock.getLegacyTypes.mockReturnValue([]);
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
  mock.supportsAccessControl.mockReturnValue(false);
  mock.isAccessControlEnabled.mockReturnValue(true);

  return mock;
};

export const typeRegistryMock = {
  create: createRegistryMock,
};
