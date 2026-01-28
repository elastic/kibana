/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  UserActivityServiceSetup,
  UserActivityServiceStart,
} from '@kbn/core-user-activity-server';

/** @internal */
export interface SessionContext {
  id?: string;
}

/** @internal */
export interface SpaceContext {
  id?: string;
}

/** @internal */
export interface UserContext {
  id?: string;
  username?: string;
  email?: string;
  roles?: string[];
  ip?: string;
}

/**
 * Context automatically injected by HTTP middleware.
 * @internal
 */
export interface InjectedContext {
  session?: SessionContext;
  kibana?: {
    space?: SpaceContext;
  };
  user?: UserContext;
}

/** @internal */
export interface InternalUserActivityServiceSetup extends UserActivityServiceSetup {
  /**
   * Sets request-scoped context that will be included in tracked actions.
   * Multiple calls merge the context.
   *
   * @param newContext {@link InjectedContext}
   */
  setInjectedContext(newContext: InjectedContext): void;
}

/** @internal */
export interface InternalUserActivityServiceStart extends UserActivityServiceStart {
  /**
   * Sets request-scoped context that will be included in tracked actions.
   * Multiple calls merge the context
   *
   * @param newContext {@link InjectedContext}.
   */
  setInjectedContext(newContext: InjectedContext): void;
}
