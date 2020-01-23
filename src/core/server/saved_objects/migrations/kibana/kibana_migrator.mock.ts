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

import { KibanaMigrator } from './kibana_migrator';
import { buildActiveMappings } from '../core';
import { SavedObjectsMapping } from '../../mappings';
const { mergeProperties } = jest.requireActual('./kibana_migrator');

const defaultSavedObjectMappings = [
  {
    pluginId: 'testplugin',
    properties: {
      testtype: {
        properties: {
          name: { type: 'keyword' },
        },
      },
    },
  },
];

const createMigrator = (
  {
    savedObjectMappings,
  }: {
    savedObjectMappings: SavedObjectsMapping[];
  } = { savedObjectMappings: defaultSavedObjectMappings }
) => {
  const mockMigrator: jest.Mocked<PublicMethodsOf<KibanaMigrator>> = {
    runMigrations: jest.fn(),
    getActiveMappings: jest.fn(),
    migrateDocument: jest.fn(),
  };

  mockMigrator.getActiveMappings.mockReturnValue(
    buildActiveMappings({ properties: mergeProperties(savedObjectMappings) })
  );
  mockMigrator.migrateDocument.mockImplementation(doc => doc);
  return mockMigrator;
};

export const mockKibanaMigrator = {
  create: createMigrator,
};
