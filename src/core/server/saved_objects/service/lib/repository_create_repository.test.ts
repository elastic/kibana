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
import { SavedObjectsRepository } from './repository';
import { mockKibanaMigrator } from '../../migrations/kibana/kibana_migrator.mock';
import { SavedObjectsSchema } from '../../schema';
import { KibanaMigrator } from '../../migrations';
import { LegacyConfig } from '../../../legacy';
jest.mock('./repository');

const { SavedObjectsRepository: originalRepository } = jest.requireActual('./repository');

describe('SavedObjectsRepository#createRepository', () => {
  const callAdminCluster = jest.fn();
  const schema = new SavedObjectsSchema({
    nsAgnosticType: { isNamespaceAgnostic: true },
    nsType: { indexPattern: 'beats', isNamespaceAgnostic: false },
    hiddenType: { isNamespaceAgnostic: true, hidden: true },
  });
  const mappings = [
    {
      pluginId: 'testplugin',
      properties: {
        nsAgnosticType: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        nsType: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        hiddenType: {
          properties: {
            name: { type: 'keyword' },
          },
        },
      },
    },
  ];
  const migrator = mockKibanaMigrator.create({ savedObjectMappings: mappings });
  const RepositoryConstructor = (SavedObjectsRepository as unknown) as jest.Mock<
    SavedObjectsRepository
  >;

  beforeEach(() => {
    RepositoryConstructor.mockClear();
  });

  it('should not allow a repository with an undefined type', () => {
    try {
      originalRepository.createRepository(
        (migrator as unknown) as KibanaMigrator,
        schema,
        {} as LegacyConfig,
        '.kibana-test',
        callAdminCluster,
        ['unMappedType1', 'unmappedType2']
      );
    } catch (e) {
      expect(e).toMatchInlineSnapshot(
        `[Error: Missing mappings for saved objects types: 'unMappedType1, unmappedType2']`
      );
    }
  });

  it('should create a repository without hidden types', () => {
    const repository = originalRepository.createRepository(
      (migrator as unknown) as KibanaMigrator,
      schema,
      {} as LegacyConfig,
      '.kibana-test',
      callAdminCluster,
      [],
      SavedObjectsRepository
    );
    expect(repository).toBeDefined();
    expect(RepositoryConstructor.mock.calls[0][0].allowedTypes).toMatchInlineSnapshot(`
      Array [
        "config",
        "nsAgnosticType",
        "nsType",
      ]
    `);
  });

  it('should create a repository with a unique list of hidden types', () => {
    const repository = originalRepository.createRepository(
      (migrator as unknown) as KibanaMigrator,
      schema,
      {} as LegacyConfig,
      '.kibana-test',
      callAdminCluster,
      ['hiddenType', 'hiddenType', 'hiddenType'],
      SavedObjectsRepository
    );
    expect(repository).toBeDefined();
    expect(RepositoryConstructor.mock.calls[0][0].allowedTypes).toMatchInlineSnapshot(`
      Array [
        "config",
        "nsAgnosticType",
        "nsType",
        "hiddenType",
      ]
    `);
  });
});
