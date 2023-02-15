/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { pipe } from 'fp-ts/lib/function';
import type { RequestHandler } from './request_handler';
import type { RequestHandlerContextBase } from './request_handler_context';
import type { RouteConfig, RouteMethod } from './route';
import type { IRouter, RouteRegistrar } from './router';
import type { RouteValidatorFullConfig } from './route_validator';

const logger: Logger = {} as any;
/** Definitely subject to revision, just used for examples */
type Version = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

/**
 * Take the lib/toolkit approach. Instead of baking the idea of versioning into
 * the router we can expose a toolkit for building a versioned API that uses our
 * HTTP router. The toolkit just wraps the router ensuring that the spec for
 * applying/extracting version information is followed.
 */

{
  /**
   * We must omit "validate" because we are going to declare multiple validations per route.
   */
  type VersionedRouteOpts = Omit<RouteConfig<unknown, unknown, unknown, RouteMethod>, 'validate'>;
  /**
   * Simplify the Registrar type by pre assigning the RouteMethod generic type
   */
  type Registrar<Context extends RequestHandlerContextBase> = RouteRegistrar<RouteMethod, Context>;
  /**
   * This is the primary interface for the toolkit
   */
  interface VersionedAPIToolkit {
    createVersionedAPI<Context extends RequestHandlerContextBase>(opts: { router: IRouter<Context> }): VersionedRouter<Context>;
  }
  interface VersionedRouter<Context extends RequestHandlerContextBase> {
    defineRoute(
      registrar: Registrar<Context>,
      opts: VersionedRouteOpts
    ): VersionedRoute<Context>;
  }
  /**
   * The toolkit defines versioned routes, taking care of all the versioning shenanigans
   * in the background.
   */
  interface VersionedRoute<Context extends RequestHandlerContextBase = RequestHandlerContextBase> {
    addVersion<P, Q, B>(
      version: Version,
      opts: { validation: RouteValidatorFullConfig<P, Q, B> },
      handler: RequestHandler<P, Q, B, Context>
    ): VersionedRoute<Context>;
  }

  const vtk: VersionedAPIToolkit = { /* TODO: implement */ } as any;
  /** A router with some custom context */
  const myRouter: IRouter<{ test: number } & RequestHandlerContextBase> = {} as any;
  const myVersionedRouter = vtk.createVersionedAPI({ router: myRouter });

  const versionedRoute = myVersionedRouter
    .defineRoute(myRouter.post, { path: '/api/my-plugin/my-route', options: {} })
    .addVersion(
      '1',
      {
        validation: { body: schema.object({ n: schema.number({ min: 0, max: 1 }) }) },
      },
      async (ctx, req, res) => {
        logger.info(String(ctx.test));
        logger.info(String(req.body.n));
        return res.ok();
      }
    )
    .addVersion(
      '2',
      {
        validation: { body: schema.object({ b: schema.number({ min: 2, max: 3 }) }) },
      },
      async (ctx, req, res) => {
        logger.info(String(req.body.b));
        return res.ok();
      }
    );

  // OR point-free style

  // `addVersion` utility
  const addVersion =
    <P, Q, B, C extends RequestHandlerContextBase>(
      version: Version,
      opts: { validation: RouteValidatorFullConfig<P, Q, B> },
      handler: RequestHandler<P, Q, B, C>
    ) =>
    (versionedRouter: VersionedRoute<C>) =>
      versionedRouter;

  // Route declaration
  pipe(
    myVersionedRouter.defineRoute(myRouter.post, { path: '/api/my-plugin/my-route', options: {} }),

    addVersion(
      '1',
      { validation: { body: schema.object({ n: schema.number({ min: 0, max: 1 }) }) } },
      async (ctx, req, res) => {
        logger.info(String(ctx.test));
        logger.info(String(req.body.n));
        return res.ok();
      }
    ),

    addVersion(
      '2',
      { validation: { body: schema.object({ b: schema.number({ min: 2, max: 3 }) }) } },
      async (ctx, req, res) => {
        logger.info(String(req.body.b));
        return res.ok();
      }
    )
  );
}
/**
 * STRENGTHS:
 *  1. Does not change the current router implementation and does not force
 *     consumers to change anything
 *  2. We can treat the versioning implementation as an open source protocol.
 *     Consumers can choose to create their own implementation (but increase maintenance).
 *  3. Removes only the boilerplate regarding versions
 *  4. Could also implement a simplified version that just takeas in a bunch of validations
 *     and passes them all to one handler, then the consumer must specify if-else/map/switch
 *     to correctly handle versions and map to the correct return type...
 * WEAKNESSES:
 *  1. Whole new API to design and implement
 *  2. Will it actually be used since this is only a recommendation?
 *  3. Requires some refactoring to adopt
 */
