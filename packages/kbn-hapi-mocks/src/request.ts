/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request } from '@hapi/hapi';
import { format as formatUrl, URL } from 'url';
import { merge } from 'lodash';
import type { DeepPartial } from '@kbn/utility-types';

export const createRequestMock = (customization: DeepPartial<Request> = {}): Request => {
  const pathname = customization.url?.pathname || '/';
  const path = `${pathname}${customization.url?.search || ''}`;
  const url = new URL(
    formatUrl(Object.assign({ pathname, path, href: path }, customization.url)),
    'http://localhost'
  );
  if (customization.query) {
    Object.entries(customization.query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return merge(
    {},
    {
      app: { xsrfRequired: true } as any,
      auth: {
        isAuthenticated: true,
      },
      headers: {},
      path,
      route: { settings: {} },
      url,
      raw: {
        req: {
          url: path,
          socket: {},
        },
        res: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        } as {},
      },
    },
    customization
  ) as Request;
};
