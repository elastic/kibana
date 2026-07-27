/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import type { TimeRange } from '@kbn/es-query';
import type { LocatorDefinition, KibanaLocation } from '.';
import { UrlService } from '.';

export class MockUrlService extends UrlService {
  constructor() {
    super({
      navigate: async () => {},
      getUrl: async ({ app, path }, { absolute }) => {
        return `${absolute ? 'http://localhost:8888' : ''}/app/${app}${path}`;
      },
      shortUrls: () => ({
        get: () => ({
          create: async () => {
            throw new Error('Not implemented.');
          },
          get: async () => {
            throw new Error('Not implemented.');
          },
          delete: async () => {
            throw new Error('Not implemented.');
          },
          resolve: async () => {
            throw new Error('Not implemented.');
          },
        }),
      }),
    });
  }
}

type MockLocatorParams = SerializableRecord & {
  timeRange: TimeRange;
};

export class MockLocatorDefinition implements LocatorDefinition<MockLocatorParams> {
  constructor(public readonly id: string) {}

  public readonly getTimeRange = (params: MockLocatorParams) => params.timeRange;

  public readonly setTimeRange = (params: MockLocatorParams, timeRange?: TimeRange) => ({
    ...params,
    timeRange,
  });

  public readonly getLocation = async (): Promise<KibanaLocation> => {
    return {
      app: 'test',
      path: '/test',
      state: {
        foo: 'bar',
      },
    };
  };
}
