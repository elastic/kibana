/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthzDisabled } from '@kbn/core/server';

export enum AuthzOptOutReason {
  DelegatesToESClient = 'Route delegates authorization to the scoped ES client',
  DelegatesToSOClient = 'Route delegates authorization to the scoped SO client',
  ServesStaticFiles = 'Serving static files that do not require authorization',
}

export class DisabledAuthz {
  static config(reason: AuthzOptOutReason | string): AuthzDisabled {
    return {
      enabled: false,
      reason,
    };
  }

  public static get delegatesToESClient(): AuthzDisabled {
    return DisabledAuthz.config(AuthzOptOutReason.DelegatesToESClient);
  }

  public static get delegatesToSOClient(): AuthzDisabled {
    return DisabledAuthz.config(AuthzOptOutReason.DelegatesToSOClient);
  }

  public static get servesStaticFiles(): AuthzDisabled {
    return DisabledAuthz.config(AuthzOptOutReason.ServesStaticFiles);
  }
}
