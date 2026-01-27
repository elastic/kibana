/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import type { ListrTask } from 'listr2';
import { relative } from 'node:path';
import { readFile } from 'fs/promises';
import type {
  TelemetrySchemaObject,
  TelemetrySchemaValue,
} from '../../schema_ftr_validations/schema_to_config_schema';
import type { TaskContext } from './task_context';
import { fetchTelemetrySchemaAtRevision, isTelemetrySchemaModified } from './git';

export function validateSchemaChanges({ baselineSha, roots, reporter }: TaskContext): ListrTask[] {
  const isPullRequestPipeline =
    Boolean(process.env.GITHUB_PR_BASE_OWNER) &&
    Boolean(process.env.GITHUB_PR_BASE_REPO) &&
    Boolean(process.env.GITHUB_PR_NUMBER);

  return [
    ...roots.flatMap((root): ListrTask[] => {
      const path = relative(REPO_ROOT, root.config.output);
      return [
        {
          task: async () => {
            root.configChanged = await isTelemetrySchemaModified({ path });
          },
          title: `Checking if ${path} telemetry schema has changed`,
          enabled: (_) => isPullRequestPipeline,
        },
        {
          task: async () => {
            if (!baselineSha) {
              throw new Error('Cannot fetch the baseline for comparison, no SHA specified.');
            }
            root.upstreamMapping = await fetchTelemetrySchemaAtRevision({
              path,
              ref: baselineSha,
            });
          },
          title: `Downloading /${baselineSha}/${path} from Github`,
          enabled: (_) => Boolean(!isPullRequestPipeline || root.configChanged),
          retry: {
            delay: 2000,
            tries: 5,
          },
        },
        {
          task: async () => {
            const newMapping = await readFile(root.config.output, 'utf-8');
            const errors = validateSchemaDiff(JSON.parse(newMapping), root.upstreamMapping);
            if (errors.length) {
              const reporterWithContext = reporter.withContext({ name: path });
              errors.forEach((error) => reporterWithContext.report(error));
            }
          },
          title: `PR checks in modified attributes in ${path}`,
          enabled: (_) => Boolean(!isPullRequestPipeline || root.configChanged),
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
      if (newSchema.type !== 'array' && !newSchema._meta?.description) {
        errors.push(
          `The _meta.description of ${fullKey} is missing. Please add it in the '.ts' file where you updated the field, and then run the 'scripts/telemetry_check --fix' to automatically update the JSON files.`
        );
      }
    } else {
      // New field. Make sure that the description is present
      if (newSchema.type !== 'array' && !newSchema._meta?.description) {
        errors.push(
          `The _meta.description of ${fullKey} is missing. Please add it in the '.ts' file where you added the new field, and then run the 'scripts/telemetry_check --fix' to automatically update the JSON files.`
        );
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
