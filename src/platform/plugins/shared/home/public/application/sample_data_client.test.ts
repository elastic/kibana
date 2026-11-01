/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getServices } from './kibana_services';
import { installSampleDataSet, uninstallSampleDataSet } from './sample_data_client';

jest.mock('./kibana_services', () => ({
  getServices: () => ({
    http: { post: mockPost, delete: mockDelete },
    uiSettings: { isDefault: mockIsDefault, set: mockSet, get: () => 'sample-index' },
    dataViewsService: { clearCache: mockClearCache },
  }),
}));

const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockIsDefault = jest.fn();
const mockSet = jest.fn();
const mockClearCache = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

test.each([
  ['sample-id', '/api/sample_data/sample-id'],
  ['../a?b#c%/café', '/api/sample_data/..%2Fa%3Fb%23c%25%2Fcaf%C3%A9'],
])('encodes installation and uninstallation IDs: %s', async (id, path) => {
  mockIsDefault.mockReturnValue(true);
  await installSampleDataSet(id, 'sample-index');
  expect(getServices().http.post).toHaveBeenCalledWith(path);
  expect(mockSet).toHaveBeenCalledWith('defaultIndex', 'sample-index');
  mockIsDefault.mockReturnValue(false);
  await uninstallSampleDataSet(id, 'sample-index');
  expect(getServices().http.delete).toHaveBeenCalledWith(path);
  expect(mockSet).toHaveBeenCalledWith('defaultIndex', null);
  expect(mockClearCache).toHaveBeenCalledTimes(2);
});
