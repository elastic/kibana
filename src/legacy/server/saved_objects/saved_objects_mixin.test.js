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

import { savedObjectsMixin } from './saved_objects_mixin';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { mockKibanaMigrator } from '../../../core/server/saved_objects/migrations/kibana/kibana_migrator.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { savedObjectsClientProviderMock } from '../../../core/server/saved_objects/service/lib/scoped_client_provider.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { convertLegacyTypes } from '../../../core/server/saved_objects/utils';
import { SavedObjectTypeRegistry } from '../../../core/server';
import { coreMock } from '../../../core/server/mocks';

const mockConfig = {
  get: jest.fn().mockReturnValue('anything'),
};

const savedObjectMappings = [
  {
    pluginId: 'testtype',
    properties: {
      testtype: {
        properties: {
          name: { type: 'keyword' },
        },
      },
    },
  },
  {
    pluginId: 'testtype2',
    properties: {
      doc1: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      doc2: {
        properties: {
          name: { type: 'keyword' },
        },
      },
    },
  },
  {
    pluginId: 'secretPlugin',
    properties: {
      hiddentype: {
        properties: {
          secret: { type: 'keyword' },
        },
      },
    },
  },
];

const savedObjectSchemas = {
  hiddentype: {
    hidden: true,
  },
  doc1: {
    indexPattern: 'other-index',
  },
};

const savedObjectTypes = convertLegacyTypes(
  {
    savedObjectMappings,
    savedObjectSchemas,
    savedObjectMigrations: {},
  },
  mockConfig
);

const typeRegistry = new SavedObjectTypeRegistry();
savedObjectTypes.forEach(type => typeRegistry.registerType(type));

const migrator = mockKibanaMigrator.create({
  types: savedObjectTypes,
});

describe('Saved Objects Mixin', () => {
  let mockKbnServer;
  let mockServer;
  const mockCallCluster = jest.fn();
  const stubCallCluster = jest.fn();
  const config = {
    'kibana.index': 'kibana.index',
    'savedObjects.maxImportExportSize': 10000,
  };
  const stubConfig = jest.fn(key => {
    return config[key];
  });

  beforeEach(() => {
    const clientProvider = savedObjectsClientProviderMock.create();
    mockServer = {
      log: jest.fn(),
      route: jest.fn(),
      decorate: jest.fn(),
      config: () => {
        return {
          get: stubConfig,
        };
      },
      indexPatternsServiceFactory: () => {
        return {
          getFieldsForWildcard: jest.fn(),
        };
      },
      plugins: {
        elasticsearch: {
          getCluster: () => {
            return {
              callWithRequest: mockCallCluster,
              callWithInternalUser: stubCallCluster,
            };
          },
          waitUntilReady: jest.fn(),
        },
      },
      newPlatform: {
        __internals: {
          elasticsearch: {
            adminClient: { callAsInternalUser: mockCallCluster },
          },
        },
      },
    };
    mockKbnServer = {
      newPlatform: {
        __internals: {
          kibanaMigrator: migrator,
          savedObjectsClientProvider: clientProvider,
          typeRegistry,
        },
        setup: {
          core: coreMock.createSetup(),
        },
        start: {
          core: coreMock.createStart(),
        },
      },
      server: mockServer,
      ready: () => {},
      pluginSpecs: {
        some: () => {
          return true;
        },
      },
      uiExports: {
        savedObjectMappings,
        savedObjectSchemas,
      },
    };
  });

  describe('no kibana plugin', () => {
    it('should not try to create anything', () => {
      mockKbnServer.pluginSpecs.some = () => false;
      savedObjectsMixin(mockKbnServer, mockServer);
      expect(mockServer.log).toHaveBeenCalledWith(expect.any(Array), expect.any(String));
      expect(mockServer.decorate).toHaveBeenCalledWith(
        'server',
        'kibanaMigrator',
        expect.any(Object)
      );
      expect(mockServer.decorate).toHaveBeenCalledTimes(2);
      expect(mockServer.route).not.toHaveBeenCalled();
    });
  });

  describe('Saved object service', () => {
    let service;

    beforeEach(async () => {
      await savedObjectsMixin(mockKbnServer, mockServer);
      const call = mockServer.decorate.mock.calls.filter(
        ([objName, methodName]) => objName === 'server' && methodName === 'savedObjects'
      );
      service = call[0][2];
    });

    it('should return all but hidden types', async () => {
      expect(service).toBeDefined();
      expect(service.types).toEqual(['config', 'testtype', 'doc1', 'doc2']);
    });

    const mockCallEs = jest.fn();
    describe('repository creation', () => {
      it('should not allow a repository with an undefined type', () => {
        expect(() => {
          service.getSavedObjectsRepository(mockCallEs, ['extraType']);
        }).toThrow(new Error("Missing mappings for saved objects type 'extraType'"));
      });

      it('should create a repository without hidden types', () => {
        const repository = service.getSavedObjectsRepository(mockCallEs);
        expect(repository).toBeDefined();
        expect(repository._allowedTypes).toEqual(['config', 'testtype', 'doc1', 'doc2']);
      });

      it('should create a repository with a unique list of allowed types', () => {
        const repository = service.getSavedObjectsRepository(mockCallEs, [
          'config',
          'config',
          'config',
        ]);
        expect(repository._allowedTypes).toEqual(['config', 'testtype', 'doc1', 'doc2']);
      });

      it('should create a repository with extraTypes minus duplicate', () => {
        const repository = service.getSavedObjectsRepository(mockCallEs, [
          'hiddentype',
          'hiddentype',
        ]);
        expect(repository._allowedTypes).toEqual([
          'config',
          'testtype',
          'doc1',
          'doc2',
          'hiddentype',
        ]);
      });

      it('should not allow a repository without a callCluster function', () => {
        expect(() => {
          service.getSavedObjectsRepository({});
        }).toThrow(new Error('Repository requires a "callCluster" function to be provided.'));
      });
    });

    describe('get client', () => {
      it('should have a method to get the client', () => {
        expect(service).toHaveProperty('getScopedSavedObjectsClient');
      });

      it('should have a method to set the client factory', () => {
        expect(service).toHaveProperty('setScopedSavedObjectsClientFactory');
      });

      it('should have a method to add a client wrapper factory', () => {
        expect(service).toHaveProperty('addScopedSavedObjectsClientWrapperFactory');
      });

      it('should allow you to set a scoped saved objects client factory', () => {
        expect(() => {
          service.setScopedSavedObjectsClientFactory({});
        }).not.toThrowError();
      });

      it('should allow you to add a scoped saved objects client wrapper factory', () => {
        expect(() => {
          service.addScopedSavedObjectsClientWrapperFactory({});
        }).not.toThrowError();
      });
    });

    describe('#getSavedObjectsClient', () => {
      let getSavedObjectsClient;

      beforeEach(() => {
        savedObjectsMixin(mockKbnServer, mockServer);
        const call = mockServer.decorate.mock.calls.filter(
          ([objName, methodName]) => objName === 'request' && methodName === 'getSavedObjectsClient'
        );
        getSavedObjectsClient = call[0][2];
      });

      it('should be callable', () => {
        mockServer.savedObjects = service;
        getSavedObjectsClient = getSavedObjectsClient.bind({});
        expect(() => {
          getSavedObjectsClient();
        }).not.toThrowError();
      });

      it('should use cached request object', () => {
        mockServer.savedObjects = service;
        getSavedObjectsClient = getSavedObjectsClient.bind({ _test: 'me' });
        const savedObjectsClient = getSavedObjectsClient();
        expect(getSavedObjectsClient()).toEqual(savedObjectsClient);
      });
    });
  });
});
