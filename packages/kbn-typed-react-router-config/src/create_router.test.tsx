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
import { createMemoryHistory } from 'history';

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
              path: '/services',
              element: <></>,
              params: t.type({
                query: t.type({
                  transactionType: t.string,
                }),
              }),
            },
            {
              path: '/services/:serviceName',
              element: <></>,
              params: t.type({
                path: t.type({
                  serviceName: t.string,
                }),
                query: t.type({
                  transactionType: t.string,
                  environment: t.string,
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
                  maxNumNodes: t.string.pipe(toNumberRt as any),
                }),
              }),
            },
          ],
        },
      ],
    },
  ] as const);

  let history = createMemoryHistory();
  let router = createRouter({ history, routes });

  beforeEach(() => {
    history = createMemoryHistory();
    router = createRouter({ history, routes });
  });

  describe('getParams', () => {
    it('returns parameters for routes matching the path only', () => {
      history.push('/services?rangeFrom=now-15m&rangeTo=now&transactionType=request');
      const topLevelParams = router.getParams('/');

      expect(topLevelParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        },
      });

      history.push('/services?rangeFrom=now-15m&rangeTo=now&transactionType=request');

      const inventoryParams = router.getParams('/services');

      expect(inventoryParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          transactionType: 'request',
        },
      });

      history.push('/traces?rangeFrom=now-15m&rangeTo=now&aggregationType=avg');

      const topTracesParams = router.getParams('/traces');

      expect(topTracesParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          aggregationType: 'avg',
        },
      });

      history.push(
        '/services/opbeans-java?rangeFrom=now-15m&rangeTo=now&environment=production&transactionType=request'
      );

      const serviceOverviewParams = router.getParams('/services/:serviceName');

      expect(serviceOverviewParams).toEqual({
        path: {
          serviceName: 'opbeans-java',
        },
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          environment: 'production',
          transactionType: 'request',
        },
      });
    });

    it('decodes the path and query parameters based on the route type', () => {
      history.push('/service-map?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3');
      const topServiceMapParams = router.getParams('/service-map');

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
        router.getParams('/service-map');
      }).toThrowError('No matching route found for /service-map');
    });
  });

  describe('matchRoutes', () => {
    it('returns only the routes matching the path', () => {
      history.push('/service-map?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3');

      expect(router.matchRoutes('/').length).toEqual(2);
      expect(router.matchRoutes('/service-map').length).toEqual(3);
    });

    it('throws an error if the given path does not match any routes', () => {
      history.push('/service-map?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3');

      expect(() => {
        router.matchRoutes('/traces');
      }).toThrowError('No matching route found for /traces');
    });
  });

  describe('link', () => {
    it('returns a link for the given route', () => {
      const serviceOverviewLink = router.link('/services/:serviceName', {
        path: { serviceName: 'opbeans-java' },
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          environment: 'production',
          transactionType: 'request',
        },
      });

      expect(serviceOverviewLink).toEqual(
        '/services/opbeans-java?environment=production&rangeFrom=now-15m&rangeTo=now&transactionType=request'
      );

      const servicesLink = router.link('/services', {
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          transactionType: 'request',
        },
      });

      expect(servicesLink).toEqual(
        '/services?rangeFrom=now-15m&rangeTo=now&transactionType=request'
      );

      const serviceMapLink = router.link('/service-map', {
        query: {
          maxNumNodes: '3',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        },
      });

      expect(serviceMapLink).toEqual('/service-map?maxNumNodes=3&rangeFrom=now-15m&rangeTo=now');
    });

    it('validates the parameters needed for the route', () => {
      expect(() => {
        router.link('/traces', {
          query: {
            rangeFrom: {},
          },
        } as any);
      }).toThrowError();

      expect(() => {
        router.link('/service-map', {
          query: {
            maxNumNodes: 3,
            rangeFrom: 'now-15m',
            rangeTo: 'now',
          },
        } as any);
      }).toThrowError();
    });
  });
});
