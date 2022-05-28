/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DatatableUtilitiesService } from './datatable_utilities_service';

export function createDatatableUtilitiesMock(): jest.Mocked<DatatableUtilitiesService> {
  return {
    clearField: jest.fn(),
    clearFieldFormat: jest.fn(),
    getAggConfig: jest.fn(),
    getDataView: jest.fn(),
    getField: jest.fn(),
    getFieldFormat: jest.fn(),
    isFilterable: jest.fn(),
    setFieldFormat: jest.fn(),
  } as unknown as jest.Mocked<DatatableUtilitiesService>;
}
