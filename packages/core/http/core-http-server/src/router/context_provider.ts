/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MaybePromise } from '@kbn/utility-types';
import type { RequestHandler } from './request_handler';
import type { RequestHandlerContextBase } from './request_handler_context';

/**
 * A function that returns a context value for a specific key of given context type.
 *
 * @remarks
 * This function will be called each time a new context is built for a handler invocation.
 *
 * @param context - A partial context object containing only the keys for values provided by plugin dependencies
 * @param rest - Additional parameters provided by the service owner of this context
 * @returns The context value associated with this key. May also return a Promise which will be resolved before
 *          attaching to the context object.
 *
 * @public
 */
export type IContextProvider<
  Context extends RequestHandlerContextBase,
  ContextName extends keyof Context
> = (
  // context.core will always be available, but plugin contexts are typed as optional
  context: Omit<Context, ContextName>,
  ...rest: HandlerParameters<RequestHandler>
) => MaybePromise<Awaited<Context[ContextName]>>;

/**
 * A function that accepts a context object and an optional number of additional arguments. Used for the generic types
 * in {@link IContextContainer}
 *
 * @public
 */
export type HandlerFunction<T extends object> = (context: T, ...args: any[]) => any;

/**
 * Extracts the type of the first argument of a {@link HandlerFunction} to represent the type of the context.
 *
 * @public
 */
export type HandlerContextType<T extends HandlerFunction<any>> = T extends HandlerFunction<infer U>
  ? U
  : never;

/**
 * Extracts the types of the additional arguments of a {@link HandlerFunction}, excluding the
 * {@link HandlerContextType}.
 *
 * @public
 */
export type HandlerParameters<T extends HandlerFunction<any>> = T extends (
  context: any,
  ...args: infer U
) => any
  ? U
  : never;
