/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type {
  RouteSecurity,
  RouteConfigOptions,
  AllRequiredCondition,
  AnyRequiredCondition,
} from '@kbn/core-http-server';
import { ReservedPrivilegesSet } from '@kbn/core-http-server';
import { unwindNestedSecurityPrivileges } from '@kbn/core-security-server';
import type { DeepPartial } from '@kbn/utility-types';

const privilegeSetSchema = schema.object(
  {
    anyRequired: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.string(),
          schema.object({ allOf: schema.arrayOf(schema.string(), { minSize: 2 }) }),
        ]),
        { minSize: 2 }
      )
    ),
    allRequired: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.string(),
          schema.object({ anyOf: schema.arrayOf(schema.string(), { minSize: 2 }) }),
        ]),
        { minSize: 1 }
      )
    ),
  },
  {
    validate: (value) => {
      if (!value.anyRequired && !value.allRequired) {
        return 'either anyRequired or allRequired must be specified';
      }
    },
  }
);

const requiredPrivilegesSchema = schema.arrayOf(
  schema.oneOf([privilegeSetSchema, schema.string()]),
  {
    validate: (value) => {
      const anyRequired: string[] = [];
      const allRequired: string[] = [];

      if (!Array.isArray(value)) {
        return undefined;
      }

      value.forEach((privilege) => {
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
      });

      if (anyRequired.includes(ReservedPrivilegesSet.superuser)) {
        return 'Using superuser privileges in anyRequired is not allowed';
      }

      const hasSuperuserInAllRequired = allRequired.includes(ReservedPrivilegesSet.superuser);
      const hasOperatorInAllRequired = allRequired.includes(ReservedPrivilegesSet.operator);

      // Combining superuser with other privileges is redundant.
      // If user is a superuser, they inherently have access to all the privileges that may come with other roles.
      // The exception is when superuser and operator are the only required privileges.
      if (
        hasSuperuserInAllRequired &&
        allRequired.length > 1 &&
        !(hasOperatorInAllRequired && allRequired.length === 2)
      ) {
        return 'Combining superuser with other privileges is redundant, superuser privileges set can be only used as a standalone privilege.';
      }

      // Operator privilege requires at least one additional non-operator privilege to be defined, that's why it's not allowed in anyRequired.
      if (anyRequired.includes(ReservedPrivilegesSet.operator)) {
        return 'Using operator privileges in anyRequired is not allowed';
      }

      if (hasOperatorInAllRequired && allRequired.length === 1) {
        return 'Operator privilege requires at least one additional non-operator privilege to be defined';
      }

      if (anyRequired.length && allRequired.length) {
        for (const privilege of anyRequired) {
          if (allRequired.includes(privilege)) {
            return `anyRequired and allRequired cannot have the same values: [${privilege}]`;
          }
        }
      }

      if (anyRequired.length) {
        const uniqueAnyPrivileges = new Set([...anyRequired]);

        if (anyRequired.length !== uniqueAnyPrivileges.size) {
          return 'anyRequired privileges must contain unique values';
        }
      }

      if (allRequired.length) {
        const uniqueAllPrivileges = new Set([...allRequired]);

        if (allRequired.length !== uniqueAllPrivileges.size) {
          return 'allRequired privileges must contain unique values';
        }
      }
    },
    minSize: 1,
  }
);

const authzSchema = schema.object({
  enabled: schema.maybe(schema.literal(false)),
  requiredPrivileges: schema.conditional(
    schema.siblingRef('enabled'),
    schema.never(),
    requiredPrivilegesSchema,
    schema.never()
  ),
  reason: schema.conditional(
    schema.siblingRef('enabled'),
    schema.never(),
    schema.never(),
    schema.string()
  ),
});

const authcSchema = schema.object({
  enabled: schema.oneOf([schema.literal(true), schema.literal('optional'), schema.literal(false)]),
  reason: schema.conditional(
    schema.siblingRef('enabled'),
    schema.literal(false),
    schema.string(),
    schema.never()
  ),
});

const routeSecuritySchema = schema.object({
  authz: authzSchema,
  authc: schema.maybe(authcSchema),
});

export const validRouteSecurity = (
  routeSecurity?: DeepPartial<RouteSecurity>,
  options?: DeepPartial<RouteConfigOptions<any>>
) => {
  if (!routeSecurity) {
    return routeSecurity;
  }

  if (routeSecurity?.authc !== undefined && options?.authRequired !== undefined) {
    throw new Error('Cannot specify both security.authc and options.authRequired');
  }

  return routeSecuritySchema.validate(routeSecurity);
};
