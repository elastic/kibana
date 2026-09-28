/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type {
  ActionScope,
  ConnectorAlertingHint,
  ConnectorMetadata,
  ConnectorSpec,
} from '../connector_spec';
import { TEST_CONNECTOR_SUB_ACTION } from '../connector_spec';
import { generateSecretsSchemaFromSpec } from './generate_secrets_schema_from_spec';

export interface SerializeConnectorSpecOptions {
  isPfxEnabled: boolean;
  isEarsEnabled: boolean;
  isEarsExperimentalEnabled: boolean;
  logger?: Logger;
}

export interface SerializedConnectorAction {
  input: Record<string, unknown>;
  description?: string;
  scope: ActionScope;
}

export interface SerializedConnectorSpec {
  metadata: ConnectorMetadata;
  schema: Record<string, unknown>;
  actions: Record<string, SerializedConnectorAction>;
  alerting?: ConnectorAlertingHint;
}

export function serializeConnectorActions(actions: ConnectorSpec['actions']): {
  actions: Record<string, SerializedConnectorAction>;
  skipped: string[];
} {
  const serialized: Record<string, SerializedConnectorAction> = {};
  const skipped: string[] = [];

  for (const [name, action] of Object.entries(actions)) {
    if (name === TEST_CONNECTOR_SUB_ACTION) {
      continue;
    }

    try {
      serialized[name] = {
        input: z.toJSONSchema(action.input, { unrepresentable: 'any' }) as Record<string, unknown>,
        ...(action.description !== undefined ? { description: action.description } : {}),
        scope: action.scope,
      };
    } catch {
      skipped.push(name);
    }
  }

  return { actions: serialized, skipped };
}

export function serializeConnectorSpec(
  spec: ConnectorSpec,
  options?: SerializeConnectorSpecOptions
): SerializedConnectorSpec {
  const combinedZodSchema = z
    .object({
      config: spec.schema ?? z.object({}),
      secrets: generateSecretsSchemaFromSpec(spec.auth, options),
    })
    .strict();

  const jsonSchema = z.toJSONSchema(combinedZodSchema);
  const { actions, skipped } = serializeConnectorActions(spec.actions);

  if (skipped.length > 0) {
    options?.logger?.warn(
      `Skipping unserializable action input schemas for connector "${
        spec.metadata.id
      }": ${skipped.join(', ')}`
    );
  }

  return {
    metadata: spec.metadata,
    schema: jsonSchema as Record<string, unknown>,
    actions,
    ...(spec.alerting !== undefined ? { alerting: spec.alerting } : {}),
  };
}
