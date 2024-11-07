/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Copied from "src/plugins/data/public/mocks.ts" but without any type information
// TODO: Remove this in favor of the data/public/mocks if/when they become available, https://github.com/elastic/kibana/issues/100715
export const autocompleteStartMock = {
  getQuerySuggestions: jest.fn(),
  getValueSuggestions: jest.fn(),
  hasQuerySuggestions: jest.fn(),
};
