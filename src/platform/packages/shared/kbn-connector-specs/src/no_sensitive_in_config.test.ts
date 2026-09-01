/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import * as connectorsSpecs from './all_specs';
import type { ConnectorSpec } from './connector_spec';
import { getMeta } from './connector_spec_ui';

type JsonSchema = Record<string, unknown>;
const SENSITIVE_CONFIG_FIX = 'Move the field to an auth type so it is stored as encrypted secrets.';

const isJsonSchema = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getSensitiveConfigViolations = (schema: JsonSchema, path = 'config'): string[] => {
  const violations: string[] = [];

  if (schema.sensitive === true) {
    violations.push(`${path} has sensitive: true. ${SENSITIVE_CONFIG_FIX}`);
  }
  if (schema.widget === 'password') {
    violations.push(`${path} has widget: 'password'. ${SENSITIVE_CONFIG_FIX}`);
  }

  if (isJsonSchema(schema.properties)) {
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      if (isJsonSchema(propertySchema)) {
        violations.push(...getSensitiveConfigViolations(propertySchema, `${path}.${propertyName}`));
      }
    }
  }

  if (isJsonSchema(schema.items)) {
    violations.push(...getSensitiveConfigViolations(schema.items, `${path}[]`));
  }

  for (const branchName of ['allOf', 'anyOf', 'oneOf'] as const) {
    const branches = schema[branchName];
    if (!Array.isArray(branches)) {
      continue;
    }
    branches.forEach((branch, index) => {
      if (isJsonSchema(branch)) {
        violations.push(...getSensitiveConfigViolations(branch, `${path}.${branchName}[${index}]`));
      }
    });
  }

  return violations;
};

describe('connector spec config schemas', () => {
  const allSpecs = Object.entries(connectorsSpecs) as Array<[string, ConnectorSpec]>;

  it.each(allSpecs)('%s config schema fields have labels', (_exportName, spec) => {
    const { schema } = spec;
    if (!schema) {
      return;
    }

    const fieldsWithoutLabels = Object.entries(schema.shape)
      .filter(([, fieldSchema]) => {
        const meta = getMeta(fieldSchema);
        return meta.hidden !== true && (!meta.label || meta.label.trim().length === 0);
      })
      .map(([fieldKey]) => fieldKey);

    expect(fieldsWithoutLabels).toEqual([]);
  });

  it.each(allSpecs)(
    '%s config schema must not contain sensitive or password-widget fields',
    (_exportName, spec) => {
      const { schema } = spec;
      if (!schema) {
        return;
      }

      const violations = getSensitiveConfigViolations(z.toJSONSchema(schema) as JsonSchema);

      expect(violations).toEqual([]);
    }
  );

  it('detects nested sensitive and password-widget fields in the serialized schema', () => {
    const schema = z.object({
      nested: z.object({
        apiKey: z.string().optional().meta({ sensitive: true }),
      }),
      connections: z.array(
        z.object({
          password: z.string().default('password').meta({ widget: 'password' }),
        })
      ),
    });

    expect(getSensitiveConfigViolations(z.toJSONSchema(schema) as JsonSchema)).toEqual([
      `config.nested.apiKey has sensitive: true. ${SENSITIVE_CONFIG_FIX}`,
      `config.connections[].password has widget: 'password'. ${SENSITIVE_CONFIG_FIX}`,
    ]);
  });
});
