/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FetchedIndexPattern } from '../../../../common/types';
import {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import { DefaultSearchStrategy } from './default_search_strategy';

describe('DefaultSearchStrategy', () => {
  const requestContext = {
    core: {
      uiSettings: {
        client: {
          get: jest.fn(),
        },
      },
    },
  } as unknown as VisTypeTimeseriesRequestHandlerContext;

  let defaultSearchStrategy: DefaultSearchStrategy;
  let req: VisTypeTimeseriesVisDataRequest;

  beforeEach(() => {
    req = {
      body: {
        panels: [{}],
        timerange: {
          timezone: 'Europe/Berlin',
        },
      },
    } as unknown as VisTypeTimeseriesVisDataRequest;
    defaultSearchStrategy = new DefaultSearchStrategy();
  });

  test('should init an DefaultSearchStrategy instance', () => {
    expect(defaultSearchStrategy.checkForViability).toBeDefined();
    expect(defaultSearchStrategy.search).toBeDefined();
    expect(defaultSearchStrategy.getFieldsForWildcard).toBeDefined();
  });

  test('should check a strategy for viability', async () => {
    const value = await defaultSearchStrategy.checkForViability(requestContext, req, {
      indexPattern: { getFieldByName: () => undefined },
    } as unknown as FetchedIndexPattern);

    expect(value.isViable).toBe(true);
    expect(value.capabilities).toMatchInlineSnapshot(`
      DefaultSearchCapabilities {
        "forceFixedInterval": false,
        "maxBucketsLimit": undefined,
        "panel": Object {},
        "timezone": "Europe/Berlin",
      }
    `);
  });

  test('should check a strategy for viability with timeseries rollup index', async () => {
    const value = await defaultSearchStrategy.checkForViability(requestContext, req, {
      indexPattern: {
        getFieldByName: () => ({
          timeZone: ['UTC'],
          fixedInterval: ['1h'],
        }),
      },
    } as unknown as FetchedIndexPattern);

    expect(value.isViable).toBe(true);
    expect(value.capabilities).toMatchInlineSnapshot(`
      DefaultSearchCapabilities {
        "forceFixedInterval": true,
        "maxBucketsLimit": undefined,
        "panel": Object {},
        "timezone": "UTC",
      }
    `);
  });
});
