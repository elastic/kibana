/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils/target/to_number_rt';
import { createRouter } from './create_router';
import { unconst } from './unconst';

describe('createRouter', () => {
  const routes = unconst([
    {
      path: '/',
      element: <></>,
      children: [
        {
          path: '/',
          element: <></>,
          params: t.type({
            query: t.type({
              rangeFrom: t.string,
              rangeTo: t.string,
            }),
          }),
          children: [
            {
              path: '/inventory',
              element: <></>,
              params: t.type({
                query: t.type({
                  transactionType: t.string,
                }),
              }),
            },
            {
              path: '/traces',
              element: <></>,
              params: t.type({
                query: t.type({
                  aggregationType: t.string,
                }),
              }),
            },
            {
              path: '/service-map',
              element: <></>,
              params: t.type({
                query: t.type({
                  maxNumNodes: toNumberRt,
                }),
              }),
            },
          ],
        },
      ],
    },
  ] as const);

  const router = createRouter(routes);

  describe('getParams', () => {
    it('returns parameters for routes matching the path only', () => {
      const topLevelParams = router.getParams('/', {
        pathname: '/inventory',
        search: '?rangeFrom=now-15m&rangeTo=now&transactionType=request',
        hash: '',
        state: undefined,
      });

      expect(topLevelParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        },
      });

      const inventoryParams = router.getParams('/inventory', {
        pathname: '/inventory',
        search: '?rangeFrom=now-15m&rangeTo=now&transactionType=request',
        hash: '',
        state: undefined,
      });

      expect(inventoryParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          transactionType: 'request',
        },
      });

      const topTracesParams = router.getParams('/traces', {
        pathname: '/traces',
        search: '?rangeFrom=now-15m&rangeTo=now&aggregationType=avg',
        hash: '',
        state: undefined,
      });

      expect(topTracesParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          aggregationType: 'avg',
        },
      });
    });

    it('decodes the path and query parameters based on the route type', () => {
      const topServiceMapParams = router.getParams('/service-map', {
        pathname: '/service-map',
        search: '?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3',
        hash: '',
        state: undefined,
      });

      expect(topServiceMapParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          maxNumNodes: 3,
        },
      });
    });

    it('throws an error if the given path does not match any routes', () => {
      expect(() => {
        router.getParams('/service-map', {
          pathname: '/',
          search: '',
          hash: '',
          state: undefined,
        });
      }).toThrowError('No matching route found for /service-map');
    });
  });

  describe('matchRoutes', () => {
    it('returns only the routes matching the path', () => {
      const location = {
        pathname: '/service-map',
        search: '?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3',
        hash: '',
        state: undefined,
      };

      expect(router.matchRoutes('/', location).length).toEqual(2);
      expect(router.matchRoutes('/service-map', location).length).toEqual(3);
    });

    it('throws an error if the given path does not match any routes', () => {
      const location = {
        pathname: '/service-map',
        search: '?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3',
        hash: '',
        state: undefined,
      };

      expect(() => {
        router.matchRoutes('/traces', location);
      }).toThrowError('No matching route found for /traces');
    });
  });
});
