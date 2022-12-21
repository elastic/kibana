/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SortDirection } from '@elastic/eui';
import { IStorageWrapper, Storage } from '@kbn/kibana-utils-plugin/public';
import { DataViewListItemEnhanced } from './dataview_list';
import { ALPHABETICALLY, SortingService } from './sorting_service';

describe('Sorting service', () => {
  let sortingService: SortingService<DataViewListItemEnhanced>;
  let storage: IStorageWrapper;
  beforeEach(() => {
    sortingService = new SortingService<DataViewListItemEnhanced>({
      alphabetically: (item) => item.name ?? item.title,
    });
    storage = new Storage(window.localStorage);
  });

  it('should set sorting direction', () => {
    sortingService.setColumn(ALPHABETICALLY);
    expect(storage.get('unified_search_sorting').column).toEqual(ALPHABETICALLY);
  });

  it('should set sorting column ', () => {
    sortingService.setDirection(SortDirection.ASC);
    expect(storage.get('unified_search_sorting').direction).toEqual(SortDirection.ASC);
  });

  it('should get sorting order directions', () => {
    expect(sortingService.getOrderDirections()).toEqual([SortDirection.ASC, SortDirection.DESC]);
  });

  it('should get sorting columns', () => {
    expect(sortingService.getColumns()).toEqual([ALPHABETICALLY]);
  });

  it('should sort DataViews', () => {
    const notSortedlist = [
      {
        id: 'dataview-2',
        title: 'dataview-2',
      },
      {
        id: 'dataview-1',
        title: 'dataview-1',
      },
    ];

    const Sortedlist = [
      {
        id: 'dataview-1',
        title: 'dataview-1',
      },
      {
        id: 'dataview-2',
        title: 'dataview-2',
      },
    ];

    expect(sortingService.sortData(notSortedlist)).toEqual(Sortedlist);
  });
});
