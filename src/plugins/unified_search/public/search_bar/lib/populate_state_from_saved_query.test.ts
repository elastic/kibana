/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { populateStateFromSavedQuery } from './populate_state_from_saved_query';

import { dataPluginMock } from '../../../../data/public/mocks';
import { DataPublicPluginStart } from '../../../../data/public';
import { SavedQuery } from '../../../../data/public';
import { FilterStateStore } from '../../../../data/common';
import { getFilter } from '../../../../data/public';

describe('populateStateFromSavedQuery', () => {
  let dataMock: jest.Mocked<DataPublicPluginStart>;

  const baseSavedQuery: SavedQuery = {
    id: 'test',
    attributes: {
      title: 'test',
      description: 'test',
      query: {
        query: 'test',
        language: 'kuery',
      },
    },
  };

  beforeEach(() => {
    dataMock = dataPluginMock.createStartContract();
    dataMock.query.filterManager.setFilters = jest.fn();
    dataMock.query.filterManager.getGlobalFilters = jest.fn().mockReturnValue([]);
  });

  it('should set query', async () => {
    const savedQuery: SavedQuery = {
      ...baseSavedQuery,
    };
    populateStateFromSavedQuery(dataMock.query, savedQuery);
    expect(dataMock.query.queryString.setQuery).toHaveBeenCalled();
  });

  it('should set filters', async () => {
    const savedQuery: SavedQuery = {
      ...baseSavedQuery,
    };
    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    savedQuery.attributes.filters = [f1];
    populateStateFromSavedQuery(dataMock.query, savedQuery);
    expect(dataMock.query.queryString.setQuery).toHaveBeenCalled();
    expect(dataMock.query.filterManager.setFilters).toHaveBeenCalledWith([f1]);
  });

  it('should preserve global filters', async () => {
    const globalFilter = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
    dataMock.query.filterManager.getGlobalFilters = jest.fn().mockReturnValue([globalFilter]);
    const savedQuery: SavedQuery = {
      ...baseSavedQuery,
    };
    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    savedQuery.attributes.filters = [f1];
    populateStateFromSavedQuery(dataMock.query, savedQuery);
    expect(dataMock.query.queryString.setQuery).toHaveBeenCalled();
    expect(dataMock.query.filterManager.setFilters).toHaveBeenCalledWith([globalFilter, f1]);
  });

  it('should update timefilter', async () => {
    const savedQuery: SavedQuery = {
      ...baseSavedQuery,
    };
    savedQuery.attributes.timefilter = {
      from: '2018',
      to: '2019',
      refreshInterval: {
        pause: true,
        value: 10,
      },
    };

    dataMock.query.timefilter.timefilter.setTime = jest.fn();
    dataMock.query.timefilter.timefilter.setRefreshInterval = jest.fn();

    populateStateFromSavedQuery(dataMock.query, savedQuery);

    expect(dataMock.query.timefilter.timefilter.setTime).toHaveBeenCalledWith({
      from: savedQuery.attributes.timefilter.from,
      to: savedQuery.attributes.timefilter.to,
    });
    expect(dataMock.query.timefilter.timefilter.setRefreshInterval).toHaveBeenCalledWith(
      savedQuery.attributes.timefilter.refreshInterval
    );
  });
});
