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

// Legacy mocks - must be removed before migrating to new platform.
jest.mock('ui/chrome');

import { IndexPatternsService, IndexPatternsSetup } from '.';
import { FieldType } from './fields';
import { StaticIndexPattern } from './index_patterns';

type IndexPatternsServiceClientContract = PublicMethodsOf<IndexPatternsService>;

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<IndexPatternsSetup> = {
    FieldList: {} as any,
    flattenHitWrapper: jest.fn(),
    formatHitProvider: jest.fn(),
    IndexPatterns: jest.fn() as any,
    ui: {
      IndexPatternSelect: jest.fn(),
    },
    __LEGACY: {
      // For BWC we must temporarily export the class implementation of Field,
      // which is only used externally by the Index Pattern UI.
      FieldImpl: jest.fn(),
      IndexPatternsProvider: jest.fn(),
    },
  };

  return setupContract;
};

const createMock = () => {
  const mocked: jest.Mocked<IndexPatternsServiceClientContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const indexPatternsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};

export const mockFields: FieldType[] = [
  {
    name: 'machine.os',
    esTypes: ['text'],
    type: 'string',
    aggregatable: false,
    searchable: false,
    filterable: true,
  },
  {
    name: 'machine.os.raw',
    type: 'string',
    esTypes: ['keyword'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: 'not.filterable',
    type: 'string',
    esTypes: ['text'],
    aggregatable: true,
    searchable: false,
    filterable: false,
  },
  {
    name: 'bytes',
    type: 'number',
    esTypes: ['long'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: '@timestamp',
    type: 'date',
    esTypes: ['date'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: 'clientip',
    type: 'ip',
    esTypes: ['ip'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: 'bool.field',
    type: 'boolean',
    esTypes: ['boolean'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
];

export const mockIndexPattern: StaticIndexPattern = {
  id: 'logstash-*',
  fields: mockFields,
  title: 'logstash-*',
  timeFieldName: '@timestamp',
};
