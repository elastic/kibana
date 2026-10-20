/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteSecurity, Privileges } from '@kbn/core-http-server';
import { ReservedPrivilegesSet } from '@kbn/core-http-server';
import { flattenSecurityPrivileges, groupSecurityPrivileges } from '@kbn/core-security-server';
import type { DeepPartial } from '@kbn/utility-types';

const privilegeSetSchema = schema.object(
  {
    anyRequired: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.string(),
          schema.object({ allOf: schema.arrayOf(schema.string(), { minSize: 2, maxSize: 100 }) }),
        ]),
        { minSize: 2, maxSize: 100 }
      )
    ),
    allRequired: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.string(),
          schema.object({ anyOf: schema.arrayOf(schema.string(), { minSize: 2, maxSize: 100 }) }),
        ]),
        { minSize: 1, maxSize: 100 }
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
    maxSize: 100,
    validate: (value) => {
      if (!Array.isArray(value)) {
        return undefined;
      }

      const { anyRequired, allRequired } = groupSecurityPrivileges(value as Privileges);

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

const extendedPrivilegesSchema = schema.arrayOf(schema.any(), {
  minSize: 1,
  maxSize: 100,
  validate: (value) => {
    if (value.some((privilege) => typeof privilege !== 'string')) {
      return 'extendedPrivileges must be a flat list of privilege name strings; privilege sets (anyRequired/allRequired) are not supported';
    }

    const privileges = value as string[];

    if (privileges.includes(ReservedPrivilegesSet.superuser)) {
      return 'Using superuser privileges in extendedPrivileges is not allowed';
    }

    if (privileges.includes(ReservedPrivilegesSet.operator)) {
      return 'Using operator privileges in extendedPrivileges is not allowed';
    }

    const uniquePrivileges = new Set(privileges);
    if (privileges.length !== uniquePrivileges.size) {
      return 'extendedPrivileges must contain unique values';
    }
  },
});

const authzSchema = schema.object(
  {
    enabled: schema.maybe(schema.literal(false)),
    requiredPrivileges: schema.conditional(
      schema.siblingRef('enabled'),
      schema.never(),
      requiredPrivilegesSchema,
      schema.never()
    ),
    extendedPrivileges: schema.conditional(
      schema.siblingRef('enabled'),
      schema.never(),
      schema.maybe(extendedPrivilegesSchema),
      schema.never()
    ),
    reason: schema.conditional(
      schema.siblingRef('enabled'),
      schema.never(),
      schema.never(),
      schema.string()
    ),
  },
  {
    validate: (value) => {
      // When authz is enabled, requiredPrivileges is already required by the base schema.
      if (!value.extendedPrivileges || !value.requiredPrivileges) {
        return undefined;
      }

      const requiredPrivileges = flattenSecurityPrivileges(value.requiredPrivileges);
      const overlaps = value.extendedPrivileges.filter((privilege) =>
        requiredPrivileges.includes(privilege)
      );
      if (overlaps.length) {
        return `extendedPrivileges cannot overlap with requiredPrivileges: [${overlaps.join(
          ', '
        )}]`;
      }
    },
  }
);

const authcSchema = schema.object({
  enabled: schema.oneOf([
    schema.literal(true),
    schema.literal('optional'),
    schema.literal('minimal'),
    schema.literal(false),
  ]),
  reason: schema.conditional(
    schema.siblingRef('enabled'),
    schema.literal(true),
    schema.never(),
    schema.string()
  ),
});

const routeSecuritySchema = schema.object({
  authz: authzSchema,
  authc: schema.maybe(authcSchema),
});

export const validRouteSecurity = (routeSecurity?: DeepPartial<RouteSecurity>) => {
  if (!routeSecurity) {
    return routeSecurity;
  }

  return routeSecuritySchema.validate(routeSecurity);
};
