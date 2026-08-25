/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AllRequiredCondition, AnyRequiredCondition, Privileges } from '@kbn/core-http-server';

export enum AuthzOptOutReason {
  DelegateToESClient = 'Route delegates authorization to the scoped ES client',
  DelegateToSOClient = 'Route delegates authorization to the scoped SO client',
  ServeStaticFiles = 'Route serves static files that do not require authorization',
}

export class AuthzDisabled {
  public static fromReason(reason: AuthzOptOutReason | string): { enabled: false; reason: string } {
    return {
      enabled: false,
      reason,
    };
  }

  static readonly delegateToESClient = AuthzDisabled.fromReason(
    AuthzOptOutReason.DelegateToESClient
  );
  static readonly delegateToSOClient = AuthzDisabled.fromReason(
    AuthzOptOutReason.DelegateToSOClient
  );
  static readonly serveStaticFiles = AuthzDisabled.fromReason(AuthzOptOutReason.ServeStaticFiles);
}

export const unwindNestedSecurityPrivileges = <
  T extends Array<string | { allOf?: string[]; anyOf?: string[] }>
>(
  privileges: T
): string[] =>
  privileges.reduce((acc: string[], privilege) => {
    if (typeof privilege === 'object') {
      if (privilege.allOf?.length) {
        acc.push(...privilege.allOf);
      }

      if (privilege?.anyOf?.length) {
        acc.push(...privilege.anyOf);
      }
    } else if (typeof privilege === 'string') {
      acc.push(privilege);
    }

    return acc;
  }, []);

/**
 * Splits a route `Privileges` config into flattened anyRequired / allRequired privilege names.
 * Top-level string entries are treated as allRequired (same as route authz enforcement).
 */
export const groupSecurityPrivileges = (
  privileges: Privileges
): { anyRequired: string[]; allRequired: string[] } => {
  const anyRequired: string[] = [];
  const allRequired: string[] = [];

  for (const privilege of privileges) {
    if (typeof privilege === 'string') {
      allRequired.push(privilege);
    } else {
      if (privilege.anyRequired) {
        anyRequired.push(
          ...unwindNestedSecurityPrivileges<AnyRequiredCondition>(privilege.anyRequired)
        );
      }
      if (privilege.allRequired) {
        allRequired.push(
          ...unwindNestedSecurityPrivileges<AllRequiredCondition>(privilege.allRequired)
        );
      }
    }
  }

  return { anyRequired, allRequired };
};

/**
 * Flattens a route `Privileges` config into a single list of privilege name strings.
 */
export const flattenSecurityPrivileges = (privileges: Privileges): string[] => {
  const { anyRequired, allRequired } = groupSecurityPrivileges(privileges);
  return [...allRequired, ...anyRequired];
};
