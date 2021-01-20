/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createSearchSetupMock, createSearchStartMock } from './search/mocks';
import { createFieldFormatsSetupMock, createFieldFormatsStartMock } from './field_formats/mocks';
import { createIndexPatternsStartMock } from './index_patterns/mocks';

function createSetupContract() {
  return {
    search: createSearchSetupMock(),
    fieldFormats: createFieldFormatsSetupMock(),
  };
}

function createStartContract() {
  return {
    search: createSearchStartMock(),
    fieldFormats: createFieldFormatsStartMock(),
    indexPatterns: createIndexPatternsStartMock(),
  };
}

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
