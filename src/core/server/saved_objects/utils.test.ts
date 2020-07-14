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

import { legacyServiceMock } from '../legacy/legacy_service.mock';
import { convertLegacyTypes, convertTypesToLegacySchema } from './utils';
import { SavedObjectsLegacyUiExports, SavedObjectsType } from './types';
import { LegacyConfig, SavedObjectMigrationContext } from 'kibana/server';
import { SavedObjectUnsanitizedDoc } from './serialization';

describe('convertLegacyTypes', () => {
  let legacyConfig: ReturnType<typeof legacyServiceMock.createLegacyConfig>;

  beforeEach(() => {
    legacyConfig = legacyServiceMock.createLegacyConfig();
  });

  it('converts the legacy mappings using default values if no schemas are specified', () => {
    const uiExports: SavedObjectsLegacyUiExports = {
      savedObjectMappings: [
        {
          pluginId: 'pluginA',
          properties: {
            typeA: {
              properties: {
                fieldA: { type: 'text' },
              },
            },
            typeB: {
              properties: {
                fieldB: { type: 'text' },
              },
            },
          },
        },
        {
          pluginId: 'pluginB',
          properties: {
            typeC: {
              properties: {
                fieldC: { type: 'text' },
              },
            },
          },
        },
      ],
      savedObjectMigrations: {},
      savedObjectSchemas: {},
      savedObjectValidations: {},
      savedObjectsManagement: {},
    };

    const converted = convertLegacyTypes(uiExports, legacyConfig);
    expect(converted).toMatchSnapshot();
  });

  it('merges the mappings and the schema to create the type when schema exists for the type', () => {
    const uiExports: SavedObjectsLegacyUiExports = {
      savedObjectMappings: [
        {
          pluginId: 'pluginA',
          properties: {
            typeA: {
              properties: {
                fieldA: { type: 'text' },
              },
            },
          },
        },
        {
          pluginId: 'pluginB',
          properties: {
            typeB: {
              properties: {
                fieldB: { type: 'text' },
              },
            },
          },
        },
        {
          pluginId: 'pluginC',
          properties: {
            typeC: {
              properties: {
                fieldC: { type: 'text' },
              },
            },
          },
        },
        {
          pluginId: 'pluginD',
          properties: {
            typeD: {
              properties: {
                fieldD: { type: 'text' },
              },
            },
          },
        },
      ],
      savedObjectMigrations: {},
      savedObjectSchemas: {
        typeA: {
          indexPattern: 'fooBar',
          hidden: true,
          isNamespaceAgnostic: true,
        },
        typeB: {
          indexPattern: 'barBaz',
          hidden: false,
          multiNamespace: true,
        },
        typeD: {
          indexPattern: 'bazQux',
          hidden: false,
          // if both isNamespaceAgnostic and multiNamespace are true, the resulting namespaceType is 'agnostic'
          isNamespaceAgnostic: true,
          multiNamespace: true,
        },
      },
      savedObjectValidations: {},
      savedObjectsManagement: {},
    };

    const converted = convertLegacyTypes(uiExports, legacyConfig);
    expect(converted).toMatchSnapshot();
  });

  it('invokes indexPattern to retrieve the index when it is a function', () => {
    const indexPatternAccessor: (config: LegacyConfig) => string = jest.fn((config) => {
      config.get('foo.bar');
      return 'myIndex';
    });

    const uiExports: SavedObjectsLegacyUiExports = {
      savedObjectMappings: [
        {
          pluginId: 'pluginA',
          properties: {
            typeA: {
              properties: {
                fieldA: { type: 'text' },
              },
            },
          },
        },
      ],
      savedObjectMigrations: {},
      savedObjectSchemas: {
        typeA: {
          indexPattern: indexPatternAccessor,
          hidden: true,
          isNamespaceAgnostic: true,
        },
      },
      savedObjectValidations: {},
      savedObjectsManagement: {},
    };

    const converted = convertLegacyTypes(uiExports, legacyConfig);

    expect(indexPatternAccessor).toHaveBeenCalledWith(legacyConfig);
    expect(legacyConfig.get).toHaveBeenCalledWith('foo.bar');
    expect(converted.length).toEqual(1);
    expect(converted[0].indexPattern).toEqual('myIndex');
  });

  it('import migrations from the uiExports', () => {
    const migrationsA = {
      '1.0.0': jest.fn(),
      '2.0.4': jest.fn(),
    };
    const migrationsB = {
      '1.5.3': jest.fn(),
    };

    const uiExports: SavedObjectsLegacyUiExports = {
      savedObjectMappings: [
        {
          pluginId: 'pluginA',
          properties: {
            typeA: {
              properties: {
                fieldA: { type: 'text' },
              },
            },
          },
        },
        {
          pluginId: 'pluginB',
          properties: {
            typeB: {
              properties: {
                fieldC: { type: 'text' },
              },
            },
          },
        },
      ],
      savedObjectMigrations: {
        typeA: migrationsA,
        typeB: migrationsB,
      },
      savedObjectSchemas: {},
      savedObjectValidations: {},
      savedObjectsManagement: {},
    };

    const converted = convertLegacyTypes(uiExports, legacyConfig);
    expect(converted.length).toEqual(2);
    expect(Object.keys(converted[0]!.migrations!)).toEqual(Object.keys(migrationsA));
    expect(Object.keys(converted[1]!.migrations!)).toEqual(Object.keys(migrationsB));
  });

  it('converts the migration to the new format', () => {
    const legacyMigration = jest.fn();
    const migrationsA = {
      '1.0.0': legacyMigration,
    };

    const uiExports: SavedObjectsLegacyUiExports = {
      savedObjectMappings: [
        {
          pluginId: 'pluginA',
          properties: {
            typeA: {
              properties: {
                fieldA: { type: 'text' },
              },
            },
          },
        },
      ],
      savedObjectMigrations: {
        typeA: migrationsA,
      },
      savedObjectSchemas: {},
      savedObjectValidations: {},
      savedObjectsManagement: {},
    };

    const converted = convertLegacyTypes(uiExports, legacyConfig);
    expect(Object.keys(converted[0]!.migrations!)).toEqual(['1.0.0']);

    const migration = converted[0]!.migrations!['1.0.0']!;

    const doc = {} as SavedObjectUnsanitizedDoc;
    const context = { log: {} } as SavedObjectMigrationContext;
    migration(doc, context);

    expect(legacyMigration).toHaveBeenCalledTimes(1);
    expect(legacyMigration).toHaveBeenCalledWith(doc, context.log);
  });

  it('imports type management information', () => {
    const uiExports: SavedObjectsLegacyUiExports = {
      savedObjectMappings: [
        {
          pluginId: 'pluginA',
          properties: {
            typeA: {
              properties: {
                fieldA: { type: 'text' },
              },
            },
          },
        },
        {
          pluginId: 'pluginB',
          properties: {
            typeB: {
              properties: {
                fieldB: { type: 'text' },
              },
            },
            typeC: {
              properties: {
                fieldC: { type: 'text' },
              },
            },
          },
        },
      ],
      savedObjectsManagement: {
        typeA: {
          isImportableAndExportable: true,
          icon: 'iconA',
          defaultSearchField: 'searchFieldA',
          getTitle: (savedObject) => savedObject.id,
        },
        typeB: {
          isImportableAndExportable: false,
          icon: 'iconB',
          getEditUrl: (savedObject) => `/some-url/${savedObject.id}`,
          getInAppUrl: (savedObject) => ({ path: 'path', uiCapabilitiesPath: 'ui-path' }),
        },
      },
      savedObjectMigrations: {},
      savedObjectSchemas: {},
      savedObjectValidations: {},
    };

    const converted = convertLegacyTypes(uiExports, legacyConfig);
    expect(converted.length).toEqual(3);
    const [typeA, typeB, typeC] = converted;

    expect(typeA.management).toEqual({
      importableAndExportable: true,
      icon: 'iconA',
      defaultSearchField: 'searchFieldA',
      getTitle: uiExports.savedObjectsManagement.typeA.getTitle,
    });

    expect(typeB.management).toEqual({
      importableAndExportable: false,
      icon: 'iconB',
      getEditUrl: uiExports.savedObjectsManagement.typeB.getEditUrl,
      getInAppUrl: uiExports.savedObjectsManagement.typeB.getInAppUrl,
    });

    expect(typeC.management).toBeUndefined();
  });

  it('merges everything when all are present', () => {
    const uiExports: SavedObjectsLegacyUiExports = {
      savedObjectMappings: [
        {
          pluginId: 'pluginA',
          properties: {
            typeA: {
              properties: {
                fieldA: { type: 'text' },
              },
            },
            typeB: {
              properties: {
                fieldB: { type: 'text' },
                anotherFieldB: { type: 'boolean' },
              },
            },
          },
        },
        {
          pluginId: 'pluginB',
          properties: {
            typeC: {
              properties: {
                fieldC: { type: 'text' },
              },
            },
          },
        },
      ],
      savedObjectMigrations: {
        typeA: {
          '1.0.0': jest.fn(),
          '2.0.4': jest.fn(),
        },
        typeC: {
          '1.5.3': jest.fn(),
        },
      },
      savedObjectSchemas: {
        typeA: {
          indexPattern: jest.fn((config) => {
            config.get('foo.bar');
            return 'myIndex';
          }),
          hidden: true,
          isNamespaceAgnostic: true,
        },
        typeB: {
          convertToAliasScript: 'some alias script',
          hidden: false,
        },
      },
      savedObjectValidations: {},
      savedObjectsManagement: {},
    };

    const converted = convertLegacyTypes(uiExports, legacyConfig);
    expect(converted).toMatchSnapshot();
  });
});

describe('convertTypesToLegacySchema', () => {
  it('converts types to the legacy schema format', () => {
    const types: SavedObjectsType[] = [
      {
        name: 'typeA',
        hidden: false,
        namespaceType: 'agnostic',
        mappings: { properties: {} },
        convertToAliasScript: 'some script',
      },
      {
        name: 'typeB',
        hidden: true,
        namespaceType: 'single',
        indexPattern: 'myIndex',
        mappings: { properties: {} },
      },
      {
        name: 'typeC',
        hidden: false,
        namespaceType: 'multiple',
        mappings: { properties: {} },
      },
    ];
    expect(convertTypesToLegacySchema(types)).toEqual({
      typeA: {
        hidden: false,
        isNamespaceAgnostic: true,
        multiNamespace: false,
        convertToAliasScript: 'some script',
      },
      typeB: {
        hidden: true,
        isNamespaceAgnostic: false,
        multiNamespace: false,
        indexPattern: 'myIndex',
      },
      typeC: {
        hidden: false,
        isNamespaceAgnostic: false,
        multiNamespace: true,
      },
    });
  });
});
