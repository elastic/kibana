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
  /** Redacted session id. */
  id?: string;
}

/** @internal */
export interface SpaceContext {
  /** Kibana space id. */
  id?: string;
}

/** @internal */
export interface UserContext {
  /** User profile id. */
  id?: string;
  /** Username. */
  username?: string;
  /** User email address. */
  email?: string;
  /** User roles. */
  roles?: string[];
}

/** @internal */
export interface ClientContext {
  /** Client IP address. */
  ip?: string;
  /** Copy of {@link ClientContext.ip} for OTel compliance. */
  address?: string;
}

/** @internal */
export interface HttpRequestContext {
  /** HTTP referrer. */
  referrer?: string;
}

/**
 * Context automatically injected by HTTP middleware.
 * @internal
 */
export interface InjectedContext {
  /** Client information. */
  client?: ClientContext;
  /** HTTP request information. */
  http?: {
    request?: HttpRequestContext;
  };
  /** Session information. */
  session?: SessionContext;
  /** Kibana-specific information. */
  kibana?: {
    space?: SpaceContext;
  };
  /** User information. */
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
   * Multiple calls merge the context.
   *
   * @param newContext {@link InjectedContext}.
   */
  setInjectedContext(newContext: InjectedContext): void;
}
