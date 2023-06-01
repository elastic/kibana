/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRequest } from '@kbn/core/server';
import { SearchSource } from '@kbn/data-common';
import { createSearchSourceMock } from '@kbn/data-common/search/search_source/mocks';
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

  return {
    asScopedClient: jest
      .fn<Promise<LocatorServiceScopedClient>, [req: KibanaRequest]>()
      .mockImplementation(() => {
        return Promise.resolve({
          columnsFromLocator: columnsFromLocatorMock,
          searchSourceFromLocator: searchSourceFromLocatorMock,
          titleFromLocator: titleFromLocatorMock,
        } as LocatorServiceScopedClient);
      }),
  };
};
