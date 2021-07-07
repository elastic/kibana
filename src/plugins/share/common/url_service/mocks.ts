/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import type { LocatorDefinition, KibanaLocation } from '.';
import { UrlService } from '.';

export class MockUrlService extends UrlService {
  constructor() {
    super({
      navigate: async () => {},
      getUrl: async ({ app, path }, { absolute }) => {
        return `${absolute ? 'https://example.com' : ''}/app/${app}${path}`;
      },
    });
  }
}

export class MockLocatorDefinition implements LocatorDefinition<any> {
  constructor(public readonly id: string) {}

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
