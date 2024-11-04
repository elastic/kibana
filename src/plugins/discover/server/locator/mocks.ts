/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequest } from '@kbn/core/server';
import { Query, SearchSource } from '@kbn/data-plugin/common';
import { AggregateQuery, Filter } from '@kbn/es-query';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { DiscoverServerPluginLocatorService, LocatorServiceScopedClient } from '..';
import { DiscoverAppLocatorParams } from '../../common';

export const createLocatorServiceMock = (): DiscoverServerPluginLocatorService => {
  const mockFields = ['@timestamp', 'mock-message'];

  const columnsFromLocatorMock = jest
    .fn<Promise<string[]>, [DiscoverAppLocatorParams]>()
    .mockResolvedValue(mockFields);

  const searchSourceFromLocatorMock = jest
    .fn<Promise<SearchSource>, [DiscoverAppLocatorParams]>()
    .mockResolvedValue(createSearchSourceMock({ fields: mockFields }));

  const titleFromLocatorMock = jest
    .fn<Promise<string>, [DiscoverAppLocatorParams]>()
    .mockResolvedValue('mock search title');

  const queryFromLocatorMock = jest
    .fn<Promise<Query | AggregateQuery | undefined>, [DiscoverAppLocatorParams]>()
    .mockResolvedValue(undefined);

  const filtersFromLocatorMock = jest
    .fn<Promise<Filter[]>, [DiscoverAppLocatorParams]>()
    .mockResolvedValue([]);

  return {
    asScopedClient: jest
      .fn<Promise<LocatorServiceScopedClient>, [req: KibanaRequest]>()
      .mockImplementation(() => {
        return Promise.resolve({
          columnsFromLocator: columnsFromLocatorMock,
          searchSourceFromLocator: searchSourceFromLocatorMock,
          titleFromLocator: titleFromLocatorMock,
          queryFromLocator: queryFromLocatorMock,
          filtersFromLocator: filtersFromLocatorMock,
        } as LocatorServiceScopedClient);
      }),
  };
};
