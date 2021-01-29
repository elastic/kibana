/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  AggConfigs,
  AggTypesRegistrySetup,
  AggTypesRegistryStart,
  AggsCommonStart,
  getCalculateAutoTimeExpression,
} from '../../../common';

import { AggsSetup, AggsStart } from './types';

import { mockAggTypesRegistry } from '../../../common/search/aggs/test_helpers';

const getConfig = jest.fn();

const aggTypeBaseParamMock = () => ({
  name: 'some_param',
  type: 'some_param_type',
  displayName: 'some_agg_type_param',
  required: false,
  advanced: false,
  default: {},
  write: jest.fn(),
  serialize: jest.fn().mockImplementation(() => {}),
  deserialize: jest.fn().mockImplementation(() => {}),
  options: [],
});

const aggTypeConfigMock = () => ({
  name: 'some_name',
  title: 'some_title',
  params: [aggTypeBaseParamMock()],
});

export const aggTypesRegistrySetupMock = (): AggTypesRegistrySetup => ({
  registerBucket: jest.fn(),
  registerMetric: jest.fn(),
});

export const aggTypesRegistryStartMock = (): AggTypesRegistryStart => ({
  get: jest.fn().mockImplementation(aggTypeConfigMock),
  getAll: jest.fn().mockImplementation(() => ({
    buckets: [aggTypeConfigMock()],
    metrics: [aggTypeConfigMock()],
  })),
});

export const searchAggsSetupMock = (): AggsSetup => ({
  types: aggTypesRegistrySetupMock(),
});

const commonStartMock = (): AggsCommonStart => ({
  calculateAutoTimeExpression: getCalculateAutoTimeExpression(getConfig),
  getDateMetaByDatatableColumn: jest.fn(),
  datatableUtilities: {
    getIndexPattern: jest.fn(),
    getAggConfig: jest.fn(),
    isFilterable: jest.fn(),
  },
  createAggConfigs: jest.fn().mockImplementation((indexPattern, configStates = [], schemas) => {
    return new AggConfigs(indexPattern, configStates, {
      typesRegistry: mockAggTypesRegistry(),
    });
  }),
  types: mockAggTypesRegistry(),
});

export const searchAggsStartMock = (): AggsStart => ({
  asScopedToClient: jest.fn().mockResolvedValue(commonStartMock()),
});
