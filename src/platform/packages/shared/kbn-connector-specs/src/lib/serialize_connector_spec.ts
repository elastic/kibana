/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../connector_spec';
import { generateSecretsSchemaFromSpec } from './generate_secrets_schema_from_spec';

/**
 * Serializes a ConnectorSpec into a JSON Schema-based payload suitable for
 * client-side form generation and validation.
 *
 * UI metadata (label, sensitive, placeholder, etc.) is preserved as direct
 * properties in the JSON Schema output, which follows Zod v4's default behavior.
 *
 * Returns:
 * - metadata: unchanged from the spec
 * - schema: JSON Schema for { config, secrets } with UI metadata properties
 */
export function serializeConnectorSpec(spec: ConnectorSpec) {
  const combinedZodSchema = z.object({
    config: spec.schema ?? z.object({}),
    secrets: generateSecretsSchemaFromSpec(spec.auth),
  });

  const jsonSchema = z.toJSONSchema(combinedZodSchema);

  return {
    metadata: spec.metadata,
    schema: jsonSchema as Record<string, unknown>,
  };
}
