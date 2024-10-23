/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildFlavor } from '@kbn/config';
import type { AuthzEnabled, AuthzDisabled } from '@kbn/core-http-server';

import type { InternalRouterRoute } from './type';

interface PrivilegeGroupValue {
  allRequired: string[];
  anyRequired: string[];
}

interface PrivilegeGroups {
  all: PrivilegeGroupValue;
  serverless: PrivilegeGroupValue;
  traditional: PrivilegeGroupValue;
}

export const extractAuthzDescription = (
  route: InternalRouterRoute,
  currentOffering: BuildFlavor
) => {
  if (route.security) {
    if (!('authz' in route.security) || (route.security.authz as AuthzDisabled).enabled === false) {
      return '';
    }
    if ('authz' in route.security) {
      const privileges = (route?.security?.authz as AuthzEnabled).requiredPrivileges;
      const offeringGroupedPrivileges = privileges.reduce<PrivilegeGroups>(
        (groups, privilege) => {
          if (typeof privilege === 'string') {
            groups.all.allRequired.push(privilege);

            return groups;
          }

          const group = (privilege[currentOffering] ?? 'all') as keyof PrivilegeGroups;

          groups[group].allRequired.push(...(privilege.allRequired ?? []));
          groups[group].anyRequired.push(...(privilege.anyRequired ?? []));

          return groups;
        },
        {
          all: { allRequired: [], anyRequired: [] },
          serverless: { allRequired: [], anyRequired: [] },
          traditional: { allRequired: [], anyRequired: [] },
        }
      );

      const hasAnyOfferingPrivileges = (offering: keyof PrivilegeGroups) =>
        offeringGroupedPrivileges[offering].allRequired.length ||
        offeringGroupedPrivileges[offering].anyRequired.length;

      const getPrivilegesDescription = (allRequired: string[], anyRequired: string[]) => {
        const allDescription = allRequired.length ? `ALL of [${allRequired.join(', ')}]` : '';
        const anyDescription = anyRequired.length ? `ANY of [${anyRequired.join(' OR ')}]` : '';

        return `${allDescription}${
          allDescription && anyDescription ? ' AND ' : ''
        }${anyDescription}`;
      };

      if (!hasAnyOfferingPrivileges('serverless') && !hasAnyOfferingPrivileges('traditional')) {
        const { allRequired, anyRequired } = offeringGroupedPrivileges.all;

        return `[Authz] Route required privileges: ${getPrivilegesDescription(
          allRequired,
          anyRequired
        )}`;
      }

      const getDescriptionForOffering = (offering: string) => {
        const allRequired = [
          ...offeringGroupedPrivileges[offering as keyof PrivilegeGroups].allRequired,
          ...offeringGroupedPrivileges.all.allRequired,
        ];
        const anyRequired = [
          ...offeringGroupedPrivileges[offering as keyof PrivilegeGroups].anyRequired,
          ...offeringGroupedPrivileges.all.anyRequired,
        ];

        return `Route required privileges for: ${getPrivilegesDescription(
          allRequired,
          anyRequired
        )}.`;
      };

      return `[Authz] ${getDescriptionForOffering(currentOffering)}`;
    }
  }
};
