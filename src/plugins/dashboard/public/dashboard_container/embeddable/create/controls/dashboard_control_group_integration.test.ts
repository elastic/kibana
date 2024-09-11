/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { combineDashboardFiltersWithControlGroupFilters } from './dashboard_control_group_integration';
import { BehaviorSubject } from 'rxjs';

jest.mock('@kbn/controls-plugin/public/control_group/embeddable/control_group_container');

const testFilter1: Filter = {
  meta: {
    key: 'testfield',
    alias: null,
    disabled: false,
    negate: false,
  },
  query: { match_phrase: { testfield: 'hello' } },
};

const testFilter2: Filter = {
  meta: {
    key: 'testfield',
    alias: null,
    disabled: false,
    negate: false,
  },
  query: { match_phrase: { testfield: 'guten tag' } },
};

const testFilter3: Filter = {
  meta: {
    key: 'testfield',
    alias: null,
    disabled: false,
    negate: false,
  },
  query: {
    bool: {
      should: {
        0: { match_phrase: { testfield: 'hola' } },
        1: { match_phrase: { testfield: 'bonjour' } },
      },
    },
  },
};

describe('combineDashboardFiltersWithControlGroupFilters', () => {
  it('Combined filter pills do not get overwritten', async () => {
    const dashboardFilterPills = [testFilter1, testFilter2];
    const mockControlGroupApi = {
      filters$: new BehaviorSubject<Filter[] | undefined>([]),
    };
    const combinedFilters = combineDashboardFiltersWithControlGroupFilters(
      dashboardFilterPills,
      mockControlGroupApi
    );
    expect(combinedFilters).toEqual(dashboardFilterPills);
  });

  it('Combined control filters do not get overwritten', async () => {
    const controlGroupFilters = [testFilter1, testFilter2];
    const mockControlGroupApi = {
      filters$: new BehaviorSubject<Filter[] | undefined>(controlGroupFilters),
    };
    const combinedFilters = combineDashboardFiltersWithControlGroupFilters(
      [] as Filter[],
      mockControlGroupApi
    );
    expect(combinedFilters).toEqual(controlGroupFilters);
  });

  it('Combined dashboard filter pills and control filters do not get overwritten', async () => {
    const dashboardFilterPills = [testFilter1, testFilter2];
    const controlGroupFilters = [testFilter3];
    const mockControlGroupApi = {
      filters$: new BehaviorSubject<Filter[] | undefined>(controlGroupFilters),
    };
    const combinedFilters = combineDashboardFiltersWithControlGroupFilters(
      dashboardFilterPills,
      mockControlGroupApi
    );
    expect(combinedFilters).toEqual(dashboardFilterPills.concat(controlGroupFilters));
  });
});
