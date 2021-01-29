/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FilterManager } from './filter_manager';
import { coreMock } from '../../../../../core/public/mocks';
import {
  Filter,
  FilterManager as QueryFilterManager,
  IndexPatternsContract,
} from '../../../../data/public';

const setupMock = coreMock.createSetup();

class FilterManagerTest extends FilterManager {
  createFilter() {
    return {} as Filter;
  }

  getValueFromFilterBar() {
    return null;
  }
}

describe('FilterManager', function () {
  const controlId = 'control1';

  describe('findFilters', function () {
    let kbnFilters: Filter[];
    const queryFilterMock = new QueryFilterManager(setupMock.uiSettings);
    queryFilterMock.getAppFilters = () => kbnFilters;
    queryFilterMock.getGlobalFilters = () => [];

    let filterManager: FilterManagerTest;
    beforeEach(() => {
      kbnFilters = [];
      filterManager = new FilterManagerTest(
        controlId,
        'field1',
        '1',
        {} as IndexPatternsContract,
        queryFilterMock
      );
    });

    test('should not find filters that are not controlled by any visualization', function () {
      kbnFilters.push({} as Filter);
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(0);
    });

    test('should not find filters that are controlled by other Visualizations', function () {
      kbnFilters.push({
        meta: {
          controlledBy: 'anotherControl',
        },
      } as Filter);
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(0);
    });

    test('should find filter that is controlled by target Visualization', function () {
      kbnFilters.push({
        meta: {
          controlledBy: controlId,
        },
      } as Filter);
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(1);
    });
  });
});
