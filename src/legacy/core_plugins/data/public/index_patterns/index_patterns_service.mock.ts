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

import { IndexPatternsService, IndexPatternsSetup } from '.';
// @ts-ignore
import { flattenHitWrapper } from './index_patterns/flatten_hit';

type IndexPatternsServiceClientContract = PublicMethodsOf<IndexPatternsService>;

const createSetupContractMock = () => {
  // Legacy mock - must be removed before migrating to new platform.
  // Included here because we only want to call `jest.mock` when somebody creates
  // the mock for this contract.
  jest.mock('ui/chrome');

  const setupContract: jest.Mocked<IndexPatternsSetup> = {
    FieldList: {} as any,
    flattenHitWrapper: jest.fn().mockImplementation(flattenHitWrapper),
    formatHitProvider: jest.fn(),
    indexPatterns: jest.fn() as any,
    IndexPatternSelect: jest.fn(),
    __LEGACY: {
      // For BWC we must temporarily export the class implementation of Field,
      // which is only used externally by the Index Pattern UI.
      FieldImpl: jest.fn(),
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
