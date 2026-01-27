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

export interface SessionContext {
  id?: string;
}

export interface SpaceContext {
  id?: string;
}

export interface UserContext {
  id?: string;
  username?: string;
  email?: string;
  roles?: string[];
  ip?: string;
}

export interface InjectedContext {
  session?: SessionContext;
  kibana?: {
    space?: SpaceContext;
  };
  user?: UserContext;
}

export interface InternalUserActivityServiceSetup extends UserActivityServiceSetup {
  setInjectedContext(newContext: InjectedContext): void;
}

export interface InternalUserActivityServiceStart extends UserActivityServiceStart {
  setInjectedContext(newContext: InjectedContext): void;
}
