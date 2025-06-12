/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AuthzEnabled,
  AuthzDisabled,
  InternalRouteSecurity,
  AllRequiredCondition,
  AnyRequiredCondition,
} from '@kbn/core-http-server';

interface PrivilegeGroupValue {
  allRequired: AllRequiredCondition;
  anyRequired: AnyRequiredCondition;
}

export const extractAuthzDescription = (routeSecurity: InternalRouteSecurity | undefined) => {
  if (!routeSecurity) {
    return '';
  }
  if (!('authz' in routeSecurity) || (routeSecurity.authz as AuthzDisabled).enabled === false) {
    return '';
  }

  const privileges = (routeSecurity.authz as AuthzEnabled).requiredPrivileges;

  const groupedPrivileges = privileges.reduce<PrivilegeGroupValue>(
    (groups, privilege) => {
      if (typeof privilege === 'string') {
        groups.allRequired.push(privilege);

        return groups;
      }
      groups.allRequired.push(...(privilege.allRequired ?? []));
      groups.anyRequired.push(...(privilege.anyRequired ?? []));

      return groups;
    },
    {
      anyRequired: [],
      allRequired: [],
    }
  );

  const getPrivilegesDescription = (
    allRequired: AllRequiredCondition,
    anyRequired: AnyRequiredCondition
  ) => {
    const allPrivileges = allRequired
      .map((privilege) =>
        typeof privilege === 'string' ? privilege : `(${privilege.anyOf?.join(' OR ')})`
      )
      .join(' AND ');
    const anyPrivileges = anyRequired
      .map((privilege) =>
        typeof privilege === 'string' ? privilege : `(${privilege.allOf?.join(' AND ')})`
      )
      .join(' OR ');
    const allDescription = allRequired.length ? allPrivileges : '';
    const anyDescription = anyRequired.length ? anyPrivileges : '';

    if (allDescription && anyDescription) {
      return `(${allDescription}) AND (${anyDescription})`;
    }

    return `${allDescription}${anyDescription}`;
  };

  const getDescriptionForRoute = () => {
    const allRequired = [...groupedPrivileges.allRequired];
    const anyRequired = [...groupedPrivileges.anyRequired];

    return `Route required privileges: ${getPrivilegesDescription(allRequired, anyRequired)}.`;
  };

  return `[Required authorization] ${getDescriptionForRoute()}`;
};
