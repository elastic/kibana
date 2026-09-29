/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import { clearStateFromSavedQuery } from './clear_saved_query';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

describe('clearStateFromSavedQuery', () => {
  let dataMock: Mocked<DataPublicPluginStart>;

  beforeEach(() => {
    dataMock = dataPluginMock.createStartContract();
  });

  it('should clear filters and query', async () => {
    dataMock.query.filterManager.removeAll = vi.fn();
    clearStateFromSavedQuery(dataMock.query);
    expect(dataMock.query.queryString.clearQuery).toHaveBeenCalled();
    expect(dataMock.query.filterManager.removeAll).toHaveBeenCalled();
  });
});
