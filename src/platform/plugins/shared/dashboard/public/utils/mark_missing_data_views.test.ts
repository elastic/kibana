/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { markMissingDataViews } from './mark_missing_data_views';

const mockGetIdsWithTitle = jest.fn();
jest.mock('../services/kibana_services', () => ({
  dataService: {
    dataViews: { getIdsWithTitle: (...args: unknown[]) => mockGetIdsWithTitle(...args) },
  },
}));

const existingDataView = { type: 'index-pattern', type_label: 'Data view', id: 'logs' };
const missingDataView = { type: 'index-pattern', type_label: 'Data view', id: 'metrics' };
const libraryItem = { type: 'lens', type_label: 'Visualization', id: 'library-chart' };

describe('markMissingDataViews', () => {
  beforeEach(() => {
    mockGetIdsWithTitle.mockReset();
  });

  it('marks the data views that do not exist in the current space', async () => {
    mockGetIdsWithTitle.mockResolvedValue([{ id: 'logs', title: 'logs-*' }]);

    expect(await markMissingDataViews([existingDataView, missingDataView, libraryItem])).toEqual([
      { ...existingDataView, isMissing: false },
      { ...missingDataView, isMissing: true },
      libraryItem,
    ]);
    expect(mockGetIdsWithTitle).toHaveBeenCalledWith(true);
  });

  it('does not load data views when none are related', async () => {
    expect(await markMissingDataViews([libraryItem])).toEqual([libraryItem]);
    expect(mockGetIdsWithTitle).not.toHaveBeenCalled();
  });

  it('leaves the data views unchecked when they cannot be loaded', async () => {
    mockGetIdsWithTitle.mockRejectedValue(new Error('Forbidden'));

    expect(await markMissingDataViews([missingDataView])).toEqual([missingDataView]);
  });
});
