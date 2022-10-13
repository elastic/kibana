/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { clearStateFromSavedQuery } from './clear_saved_query';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

describe('clearStateFromSavedQuery', () => {
  let dataMock: jest.Mocked<DataPublicPluginStart>;

  beforeEach(() => {
    dataMock = dataPluginMock.createStartContract();
  });

  it('should clear filters and query', async () => {
    dataMock.query.filterManager.removeAll = jest.fn();
    clearStateFromSavedQuery(dataMock.query);
    expect(dataMock.query.queryString.clearQuery).toHaveBeenCalled();
    expect(dataMock.query.filterManager.removeAll).toHaveBeenCalled();
  });
});
