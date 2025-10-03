/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UPSTREAM_BRANCH, REPO_ROOT } from '@kbn/repo-info';
import type { ListrTask } from 'listr2';
import path from 'node:path';
import { readFile } from 'fs/promises';
import type {
  TelemetrySchemaObject,
  TelemetrySchemaValue,
} from '../../schema_ftr_validations/schema_to_config_schema';
import type { TaskContext } from './task_context';

const GIT_BASE_URL = 'https://raw.githubusercontent.com/elastic/kibana/refs/heads/';

export function prAutomatedChecks({ roots, reporter }: TaskContext): ListrTask[] {
  return [
    ...roots.flatMap((root): ListrTask[] => {
      const relativePath = path.relative(REPO_ROOT, root.config.output);
      return [
        {
          task: async () => {
            const url = `${GIT_BASE_URL}${UPSTREAM_BRANCH}/${relativePath}`;
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            }
            root.upstreamMapping = await response.json();
          },
          title: `Downloading ${relativePath} from ${UPSTREAM_BRANCH} branch`,
        },
        {
          task: async () => {
            const newMapping = await readFile(root.config.output, 'utf-8');
            const errors = validateSchemaDiff(JSON.parse(newMapping), root.upstreamMapping);
            if (errors.length) {
              const reporterWithContext = reporter.withContext({ name: relativePath });
              errors.forEach((error) => reporterWithContext.report(error));
            }
          },
          title: `PR checks in modified attributes in ${relativePath}`,
        },
      ];
    }),
    {
      task: async () => {
        if (reporter.errors.length) {
          throw reporter;
        }
      },
      title: 'Report errors',
    },
  ];
}

const NUMERIC_TYPES = ['long', 'integer', 'short', 'byte', 'double', 'float'];

function validateSchemaDiff(
  newSchema: TelemetrySchemaValue,
  baseSchema?: TelemetrySchemaValue,
  accumulatedPath: string[] = []
): string[] {
  const errors: string[] = [];
  const fullKey = accumulatedPath.join('.');

  // 1. { type: string } => final value => apply checks
  if ('type' in newSchema && typeof newSchema.type === 'string') {
    if (baseSchema && 'type' in baseSchema && baseSchema.type === newSchema.type) {
      switch (newSchema.type) {
        case 'array':
          errors.push(
            ...validateSchemaDiff(
              (newSchema as { items: TelemetrySchemaValue }).items,
              (baseSchema as { items: TelemetrySchemaValue }).items,
              accumulatedPath.concat(['items'])
            )
          );
          break;
        default:
          if (baseSchema._meta?.description && !newSchema._meta?.description) {
            errors.push(
              `The _meta.description of ${fullKey} has been removed. Please add it back.`
            );
          }
          break;
      }
    } else if (baseSchema) {
      // Existing field, but type has changed: check compatibility

      if ('properties' in baseSchema) {
        errors.push(
          `Incompatible change in key "${fullKey}": it has been changed from an object to a single value.`
        );
      }

      if ('type' in baseSchema) {
        // Keep growing this one as we find learn more about compatibility issues
        if (NUMERIC_TYPES.includes(newSchema.type) && !NUMERIC_TYPES.includes(baseSchema.type)) {
          errors.push(
            `Incompatible change in key "${fullKey}": it has been changed from a non-numeric type "${baseSchema.type}" to a numeric type "${newSchema.type}".`
          );
        }
        if (newSchema.type === 'boolean' && baseSchema.type !== 'boolean') {
          errors.push(
            `Incompatible change in key "${fullKey}": it has been changed from a non-boolean type "${baseSchema.type}" to a "boolean" type.`
          );
        }
      }

      // Modified field. Make sure that the description is present
      if (!newSchema._meta?.description) {
        errors.push(`The _meta.description of ${fullKey} is missing. Please add it.`);
      }
    } else {
      // New field. Make sure that the description is present
      if (!newSchema._meta?.description) {
        errors.push(`The _meta.description of ${fullKey} is missing. Please add it.`);
      }
    }
  } else {
    if (baseSchema && 'type' in baseSchema) {
      errors.push(
        `Incompatible change in key "${fullKey}": it has been changed from a single value to an object.`
      );
    }

    for (const [key, newValue] of Object.entries(newSchema.properties)) {
      const baseValue = (baseSchema as TelemetrySchemaObject | undefined)?.properties?.[key];
      const nextAccumulatedPath = accumulatedPath.concat(['properties', key]);
      const newErrors = validateSchemaDiff(newValue, baseValue, nextAccumulatedPath);
      errors.push(...newErrors);
    }
  }
  return errors;
}
