/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { type SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { lazyObject } from '@kbn/lazy-object';

const createRegistryMock = (): jest.Mocked<
  ISavedObjectTypeRegistry & Pick<SavedObjectTypeRegistry, 'registerType'>
> => {
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
    getIndex: jest.fn().mockReturnValue('.kibana-test'),
    isImportableAndExportable: jest.fn().mockReturnValue(true),
    getNameAttribute: jest.fn().mockReturnValue(undefined),
  });

  return mock;
};

export const typeRegistryMock = {
  create: createRegistryMock,
};
