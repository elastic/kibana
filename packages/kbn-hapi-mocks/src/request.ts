/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: Rename package to @kbn/fastify-mocks

import type { FastifyRequest } from 'fastify';
import { merge } from 'lodash';
import type { DeepPartial } from '@kbn/utility-types';

export const createRequestMock = (
  customization: DeepPartial<FastifyRequest> = {}
): FastifyRequest => {
  const pathname = customization.url === undefined ? '/' : new URL(customization.url).pathname;
  const url = `${pathname}${customization.url?.search || ''}`;

  return merge(
    {},
    {
      context: { config: { xsrfRequired: true } } as any,
      // auth: {
      //   isAuthenticated: true,
      // },
      headers: {},
      url,
      socket: {},
      raw: {
        url,
      },
    },
    customization
  ) as FastifyRequest;
};
