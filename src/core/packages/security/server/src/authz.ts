/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum AuthzOptOutReason {
  DelegateToESClient = 'Route delegates authorization to the scoped ES client',
  DelegateToSOClient = 'Route delegates authorization to the scoped SO client',
  ServeStaticFiles = 'Serving static files that do not require authorization',
}

export class DisabledAuthz {
  static config(reason: AuthzOptOutReason | string): { enabled: false; reason: string } {
    return {
      enabled: false,
      reason,
    };
  }

  public static get delegateToESClient() {
    return DisabledAuthz.config(AuthzOptOutReason.DelegateToESClient);
  }

  public static get delegateToSOClient() {
    return DisabledAuthz.config(AuthzOptOutReason.DelegateToSOClient);
  }

  public static get serveStaticFiles() {
    return DisabledAuthz.config(AuthzOptOutReason.ServeStaticFiles);
  }
}
