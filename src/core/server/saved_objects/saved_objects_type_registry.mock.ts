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
