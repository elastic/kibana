/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { createRouter } from './create_router';
import { InvalidRouteParamsException } from './errors/invalid_route_params_exception';
import { createMemoryHistory } from 'history';
import { last } from 'lodash';

describe('createRouter', () => {
  const routes = {
    '/': {
      element: <></>,
      children: {
        '/': {
          element: <></>,
          params: t.type({
            query: t.type({
              rangeFrom: t.string,
              rangeTo: t.string,
            }),
          }),
          defaults: {
            query: {
              rangeFrom: 'now-30m',
            },
          },
          children: {
            '/services/{serviceName}/errors': {
              element: <></>,
              params: t.type({
                path: t.type({
                  serviceName: t.string,
                }),
              }),
              children: {
                '/services/{serviceName}/errors/{groupId}': {
                  element: <></>,
                  params: t.type({
                    path: t.type({ groupId: t.string }),
                  }),
                },
                '/services/{serviceName}/errors': {
                  element: <></>,
                },
              },
            },
            '/services': {
              element: <></>,
              params: t.type({
                query: t.type({
                  transactionType: t.string,
                }),
              }),
            },
            '/services/{serviceName}': {
              element: <></>,
              children: {
                '/services/{serviceName}': {
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
              },
            },
            '/traces': {
              element: <></>,
              params: t.type({
                query: t.type({
                  aggregationType: t.string,
                  kuery: t.string,
                }),
              }),
            },
            '/service-map': {
              element: <></>,
              params: t.type({
                query: t.type({
                  maxNumNodes: t.string.pipe(toNumberRt as any),
                }),
              }),
            },
          },
        },
      },
    },
  };

  let history = createMemoryHistory();
  const router = createRouter(routes);

  beforeEach(() => {
    history = createMemoryHistory();
  });

  describe('getParams', () => {
    it('returns parameters for routes matching the path only', () => {
      history.push('/services?rangeFrom=now-15m&rangeTo=now&transactionType=request');
      const topLevelParams = router.getParams('/', history.location);

      expect(topLevelParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        },
      });

      history.push('/services?rangeFrom=now-15m&rangeTo=now&transactionType=request');

      const inventoryParams = router.getParams('/services', history.location);

      expect(inventoryParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          transactionType: 'request',
        },
      });

      history.push('/traces?rangeFrom=now-15m&rangeTo=now&aggregationType=avg&kuery=');

      const topTracesParams = router.getParams('/traces', history.location);

      expect(topTracesParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          aggregationType: 'avg',
          kuery: '',
        },
      });

      history.push(
        '/services/opbeans-java?rangeFrom=now-15m&rangeTo=now&environment=production&transactionType=request'
      );

      const serviceOverviewParams = router.getParams('/services/{serviceName}', history.location);

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
      const topServiceMapParams = router.getParams('/service-map', history.location);

      expect(topServiceMapParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          maxNumNodes: 3,
        },
      });

      history.push(
        '/traces?rangeFrom=now-15m&rangeTo=now&aggregationType=avg&kuery=service.name%3A%22metricbeat%22'
      );

      const topTracesParams = router.getParams('/traces', history.location);

      expect(topTracesParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          aggregationType: 'avg',
          kuery: 'service.name:"metricbeat"',
        },
      });
    });

    it('throws an error if the given path does not match any routes', () => {
      expect(() => {
        router.getParams('/service-map', history.location);
      }).toThrowError('/service-map does not match current path /');

      expect(() => {
        router.getParams('/services/{serviceName}', history.location);
      }).toThrowError('/services/{serviceName} does not match current path /');

      expect(() => {
        router.getParams('/service-map', '/services/{serviceName}', history.location);
      }).toThrowError('None of /service-map, /services/{serviceName} match current path /');
    });

    it('does not throw an error if the given path does not match any routes but is marked as optional', () => {
      expect(() => {
        router.getParams('/service-map', history.location, true);
      }).not.toThrowError();
    });

    it('applies defaults', () => {
      history.push('/services?rangeTo=now&transactionType=request');

      const topLevelParams = router.getParams('/', history.location);

      expect(topLevelParams).toEqual({
        path: {},
        query: {
          rangeFrom: 'now-30m',
          rangeTo: 'now',
        },
      });
    });

    it('supports multiple paths', () => {
      history.push('/service-map?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3');

      const params = router.getParams('/services', '/service-map', history.location);

      expect(params).toEqual({
        path: {},
        query: {
          maxNumNodes: 3,
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        },
      });
    });

    it('returns params for the best-matching path regardless of the order', () => {
      history.push('/services/opbeans-java/errors/foo?rangeFrom=now-15m&rangeTo=now');

      expect(
        router.getParams(
          '/services/{serviceName}/errors',
          '/services/{serviceName}/errors/*',
          history.location
        ).path
      ).toEqual(
        expect.objectContaining({
          groupId: 'foo',
        })
      );

      expect(
        router.getParams(
          '/services/{serviceName}/errors/*',
          '/services/{serviceName}/errors',
          history.location
        ).path
      ).toEqual(
        expect.objectContaining({
          groupId: 'foo',
        })
      );

      expect(router.getParams('/*', history.location).path).toEqual(
        expect.objectContaining({
          groupId: 'foo',
        })
      );

      expect(
        router.getParams(
          '/services/{serviceName}/errors',
          '/services/{serviceName}/errors/{groupId}',
          history.location
        ).path
      ).toEqual(
        expect.objectContaining({
          groupId: 'foo',
        })
      );
    });
  });

  describe('matchRoutes', () => {
    it('returns only the routes matching the path', () => {
      history.push('/service-map?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3');

      expect(router.matchRoutes('/', history.location).length).toEqual(2);
      expect(router.matchRoutes('/service-map', history.location).length).toEqual(3);
    });

    it('throws an error if the given path does not match any routes', () => {
      history.push('/service-map?rangeFrom=now-15m&rangeTo=now&maxNumNodes=3');

      expect(() => {
        router.matchRoutes('/traces', history.location);
      }).toThrowError('/traces does not match current path /service-map');
    });

    it('applies defaults', () => {
      history.push('/services?rangeTo=now&transactionType=request');

      const matches = router.matchRoutes('/', history.location);

      expect(matches[1]?.match.params).toEqual({
        query: {
          rangeFrom: 'now-30m',
          rangeTo: 'now',
        },
      });
    });

    it('matches deep routes', () => {
      history.push('/services/opbeans-java/errors/foo?rangeFrom=now-15m&rangeTo=now');

      const matchedRoutes = router.matchRoutes(
        '/services/{serviceName}/errors/{groupId}',
        history.location
      );

      expect(matchedRoutes.length).toEqual(4);

      expect(matchedRoutes[matchedRoutes.length - 1].match).toEqual({
        isExact: true,
        params: {
          path: {
            groupId: 'foo',
          },
        },
        path: '/services/:serviceName/errors/:groupId',
        url: '/services/opbeans-java/errors/foo',
      });
    });
  });

  describe('link', () => {
    it('returns a link for the given route', () => {
      const serviceOverviewLink = router.link('/services/{serviceName}', {
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

    it('applies defaults', () => {
      const href = router.link('/traces', {
        // @ts-ignore
        query: {
          rangeTo: 'now',
          aggregationType: 'avg',
          kuery: '',
        },
      });

      expect(href).toEqual('/traces?aggregationType=avg&kuery=&rangeFrom=now-30m&rangeTo=now');
    });

    it('encodes query parameters', () => {
      const href = router.link('/traces', {
        // @ts-ignore
        query: {
          rangeTo: 'now',
          aggregationType: 'avg',
          kuery: 'service.name:"metricbeat"',
        },
      });

      expect(href).toEqual(
        '/traces?aggregationType=avg&kuery=service.name%3A%22metricbeat%22&rangeFrom=now-30m&rangeTo=now'
      );
    });
  });

  describe('getRoutePath', () => {
    it('returns the correct route path', () => {
      expect(
        router.getRoutePath(last(router.getRoutesToMatch('/services/opbeans-java/errors'))!)
      ).toBe('/services/{serviceName}/errors');
    });
  });

  describe('invalid query params recovery', () => {
    it('throws InvalidRouteParamsException when a query param has null value and a default exists', () => {
      // ?rangeFrom (bare key, parsed as null by query-string) + valid rangeTo
      history.push('/services?rangeFrom&rangeTo=now&transactionType=request');

      expect(() => {
        router.getParams('/services', history.location);
      }).toThrow(InvalidRouteParamsException);

      try {
        router.getParams('/services', history.location);
      } catch (e) {
        const error = e as InvalidRouteParamsException;
        // rangeFrom should be replaced with default, rangeTo and transactionType preserved
        expect(error.patched.query).toEqual(
          expect.objectContaining({
            rangeFrom: 'now-30m',
            rangeTo: 'now',
            transactionType: 'request',
          })
        );
      }
    });

    it('throws InvalidRouteParamsException preserving valid params when a codec fails and param is optional', () => {
      const recoverableRoutes = {
        '/': {
          element: <></>,
          params: t.type({
            query: t.intersection([
              t.type({
                rangeFrom: t.string,
                rangeTo: t.string,
              }),
              t.partial({
                page: toNumberRt,
              }),
            ]),
          }),
        },
      };

      const recoverableRouter = createRouter(recoverableRoutes);

      // page=abc will fail toNumberRt; rangeFrom and rangeTo are valid
      history.push('/?rangeFrom=now-15m&rangeTo=now&page=abc');

      expect(() => {
        recoverableRouter.getParams('/', history.location);
      }).toThrow(InvalidRouteParamsException);

      try {
        recoverableRouter.getParams('/', history.location);
      } catch (e) {
        const error = e as InvalidRouteParamsException;
        // page has no default so it should be removed; rangeFrom and rangeTo preserved
        expect(error.patched.query).toEqual(
          expect.objectContaining({
            rangeFrom: 'now-15m',
            rangeTo: 'now',
          })
        );
        expect(error.patched.query).not.toHaveProperty('page');
      }
    });

    it('throws a plain Error when recovery with defaults also fails', () => {
      // rangeTo is required with no default — removing the invalid param still won't satisfy the codec
      history.push('/services?transactionType=request');

      expect(() => {
        router.getParams('/services', history.location);
      }).not.toThrow(InvalidRouteParamsException);

      expect(() => {
        router.getParams('/services', history.location);
      }).toThrow(Error);
    });

    it('does not throw when all query params are valid', () => {
      history.push('/services?rangeFrom=now-15m&rangeTo=now&transactionType=request');

      expect(() => {
        router.getParams('/services', history.location);
      }).not.toThrow();
    });

    it('throws InvalidParamsException when a child route param is null and the child has its own default', () => {
      const parentChildRoutes = {
        '/': {
          element: <></>,
          params: t.type({
            query: t.type({
              rangeFrom: t.string,
              rangeTo: t.string,
            }),
          }),
          defaults: {
            query: {
              rangeFrom: 'now-30m',
            },
          },
          children: {
            '/inventory': {
              element: <></>,
              params: t.type({
                query: t.type({
                  sortField: t.string,
                }),
              }),
              defaults: {
                query: {
                  sortField: 'name',
                },
              },
            },
          },
        },
      };

      const parentChildRouter = createRouter(parentChildRoutes);

      // sortField is null (bare key); parent params are valid
      history.push('/inventory?rangeFrom=now-15m&rangeTo=now&sortField');

      expect(() => {
        parentChildRouter.getParams('/inventory', history.location);
      }).toThrow(InvalidRouteParamsException);

      try {
        parentChildRouter.getParams('/inventory', history.location);
      } catch (e) {
        const error = e as InvalidRouteParamsException;
        // sortField should be replaced with child's default; parent params preserved in query
        expect(error.patched.query).toEqual(
          expect.objectContaining({
            rangeFrom: 'now-15m',
            rangeTo: 'now',
            sortField: 'name',
          })
        );
      }
    });

    it('recovers both parent and child null params in a single InvalidParamsException', () => {
      const parentChildRoutes = {
        '/': {
          element: <></>,
          params: t.type({
            query: t.type({
              rangeFrom: t.string,
              rangeTo: t.string,
            }),
          }),
          defaults: {
            query: {
              rangeFrom: 'now-30m',
            },
          },
          children: {
            '/inventory': {
              element: <></>,
              params: t.type({
                query: t.type({
                  sortField: t.string,
                }),
              }),
              defaults: {
                query: {
                  sortField: 'name',
                },
              },
            },
          },
        },
      };

      const parentChildRouter = createRouter(parentChildRoutes);

      // Both rangeFrom (parent) and sortField (child) are null bare keys
      history.push('/inventory?rangeFrom&rangeTo=now&sortField');

      expect(() => {
        parentChildRouter.getParams('/inventory', history.location);
      }).toThrow(InvalidRouteParamsException);

      try {
        parentChildRouter.getParams('/inventory', history.location);
      } catch (e) {
        const error = e as InvalidRouteParamsException;
        // Both should be recovered: rangeFrom from parent default, sortField from child default
        expect(error.patched.query).toEqual(
          expect.objectContaining({
            rangeFrom: 'now-30m',
            rangeTo: 'now',
            sortField: 'name',
          })
        );
      }
    });

    it('respects codecs that accept null as a valid value', () => {
      const nullableRoutes = {
        '/': {
          element: <></>,
          params: t.type({
            query: t.type({
              filter: t.union([t.string, t.null]),
            }),
          }),
        },
      };

      const nullableRouter = createRouter(nullableRoutes);

      // ?filter (bare key, parsed as null) should pass because t.null is in the union
      history.push('/?filter');
      const params = nullableRouter.getParams('/', history.location);
      expect(params).toEqual({
        path: {},
        query: { filter: null },
      });
    });
  });
});
