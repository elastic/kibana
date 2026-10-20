/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLVariableType } from '@kbn/esql-types';
import { BehaviorSubject } from 'rxjs';
import { CHANGE_POINT_GRID_EMBEDDABLE_TYPE } from '../../../common';
import { createStartContractMock } from '../../__mocks__/start_contract';
import { discoverServiceMock } from '../../__mocks__/services';
import { ExploreChangePointGridInDiscoverAction } from './explore_change_point_grid_in_discover_action';
import type { ChangePointGridSearchRequest } from '../change_point_grid/resolve_change_point_grid_search_request';

const applicationMock = createStartContractMock();
const searchContext: ChangePointGridSearchRequest = {
  timeRange: { from: 'now-15m', to: 'now' },
  filters: [],
  esqlVariables: [],
  isApproximate: false,
  projectRouting: undefined,
};

const embeddable = {
  type: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
  esql$: new BehaviorSubject([{ esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp' }]),
  searchContext$: new BehaviorSubject<ChangePointGridSearchRequest | undefined>(searchContext),
  applyDashboardContext: true,
  parentApi: {},
};

describe('ExploreChangePointGridInDiscoverAction', () => {
  const action = new ExploreChangePointGridInDiscoverAction(
    applicationMock,
    discoverServiceMock.locator
  );

  beforeEach(() => {
    embeddable.searchContext$.next(searchContext);
    embeddable.applyDashboardContext = true;
    jest.mocked(discoverServiceMock.locator.navigate).mockClear();
  });

  it('is compatible with a change point panel once its search context is ready', async () => {
    embeddable.searchContext$.next(undefined);
    expect(await action.isCompatible({ embeddable })).toBe(false);

    embeddable.searchContext$.next(searchContext);
    expect(await action.isCompatible({ embeddable })).toBe(true);
    expect(await action.isCompatible({ embeddable: { ...embeddable, type: 'other' } })).toBe(false);
  });

  it('stays hidden for a static panel that stored ES|QL variables', async () => {
    embeddable.applyDashboardContext = false;
    embeddable.searchContext$.next({
      ...searchContext,
      esqlVariables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
    });

    expect(await action.isCompatible({ embeddable })).toBe(false);
  });

  it('navigates with the panel query and current time range', async () => {
    await action.execute({ embeddable });

    expect(discoverServiceMock.locator.navigate).toHaveBeenCalledWith({
      query: { esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp' },
      timeRange: searchContext.timeRange,
      esqlApproximation: false,
    });
  });

  it('navigates a static panel with its saved context', async () => {
    embeddable.applyDashboardContext = false;
    embeddable.searchContext$.next({
      ...searchContext,
      timeRange: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
      inputQuery: { query: 'host:web', language: 'kuery' },
    });

    await action.execute({ embeddable });

    expect(discoverServiceMock.locator.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
        query: {
          esql: 'FROM logs-*\n| WHERE KQL("""host:web""") | CHANGE_POINT count ON @timestamp',
        },
      })
    );
  });
});
