/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Privileges } from '@kbn/core-http-server';
export declare enum AuthzOptOutReason {
  DelegateToESClient = 'Route delegates authorization to the scoped ES client',
  DelegateToSOClient = 'Route delegates authorization to the scoped SO client',
  ServeStaticFiles = 'Route serves static files that do not require authorization',
}
export declare class AuthzDisabled {
  static fromReason(reason: AuthzOptOutReason | string): {
    enabled: false;
    reason: string;
  };
  static readonly delegateToESClient: {
    enabled: false;
    reason: string;
  };
  static readonly delegateToSOClient: {
    enabled: false;
    reason: string;
  };
  static readonly serveStaticFiles: {
    enabled: false;
    reason: string;
  };
}
export declare const unwindNestedSecurityPrivileges: <
  T extends Array<
    | string
    | {
        allOf?: string[];
        anyOf?: string[];
      }
  >
>(
  privileges: T
) => string[];
/**
 * Splits a route `Privileges` config into flattened anyRequired / allRequired privilege names.
 * Top-level string entries are treated as allRequired (same as route authz enforcement).
 */
export declare const groupSecurityPrivileges: (privileges: Privileges) => {
  anyRequired: string[];
  allRequired: string[];
};
/**
 * Flattens a route `Privileges` config into a single list of privilege name strings.
 */
export declare const flattenSecurityPrivileges: (privileges: Privileges) => string[];
