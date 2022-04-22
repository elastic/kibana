/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createFieldFormatsSetupMock,
  createFieldFormatsStartMock,
} from '@kbn/field-formats-plugin/server/mocks';
import {
  createSearchSetupMock,
  createSearchStartMock,
  createSearchRequestHandlerContext,
} from './search/mocks';
import { createIndexPatternsStartMock } from './data_views/mocks';
import { createDatatableUtilitiesMock } from './datatable_utilities/mock';
import { DataRequestHandlerContext } from './search';

function createSetupContract() {
  return {
    search: createSearchSetupMock(),
    /**
     * @deprecated - use directly from "fieldFormats" plugin instead
     */
    fieldFormats: createFieldFormatsSetupMock(),
  };
}

function createStartContract() {
  return {
    search: createSearchStartMock(),
    /**
     * @deprecated - use directly from "fieldFormats" plugin instead
     */
    fieldFormats: createFieldFormatsStartMock(),
    indexPatterns: createIndexPatternsStartMock(),
    datatableUtilities: createDatatableUtilitiesMock(),
  };
}

function createRequestHandlerContext() {
  return {
    search: createSearchRequestHandlerContext(),
  } as unknown as jest.Mocked<DataRequestHandlerContext>;
}

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
  createRequestHandlerContext,
};
