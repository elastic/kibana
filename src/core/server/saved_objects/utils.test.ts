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
import { LegacyConfig } from 'kibana/server';

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
            typeC: {
              properties: {
                fieldC: { type: 'text' },
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
      },
      savedObjectValidations: {},
      savedObjectsManagement: {},
    };

    const converted = convertLegacyTypes(uiExports, legacyConfig);
    expect(converted).toMatchSnapshot();
  });

  it('invokes indexPattern to retrieve the index when it is a function', () => {
    const indexPatternAccessor: (config: LegacyConfig) => string = jest.fn(config => {
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
    expect(converted[0].migrations).toEqual(migrationsA);
    expect(converted[1].migrations).toEqual(migrationsB);
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
          indexPattern: jest.fn(config => {
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
        namespaceAgnostic: true,
        mappings: { properties: {} },
        convertToAliasScript: 'some script',
      },
      {
        name: 'typeB',
        hidden: true,
        namespaceAgnostic: false,
        indexPattern: 'myIndex',
        mappings: { properties: {} },
      },
    ];
    expect(convertTypesToLegacySchema(types)).toEqual({
      typeA: {
        hidden: false,
        isNamespaceAgnostic: true,
        convertToAliasScript: 'some script',
      },
      typeB: {
        hidden: true,
        isNamespaceAgnostic: false,
        indexPattern: 'myIndex',
      },
    });
  });
});
