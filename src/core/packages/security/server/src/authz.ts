/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
