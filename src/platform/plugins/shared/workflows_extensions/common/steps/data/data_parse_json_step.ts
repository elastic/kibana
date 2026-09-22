/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const DataParseJsonStepTypeId = 'data.parseJson' as const;

export const ConfigSchema = z.object({
  source: z.unknown(),
});

export const InputSchema = z.object({});

export const OutputSchema = z.unknown();

export type DataParseJsonStepConfigSchema = typeof ConfigSchema;
export type DataParseJsonStepInputSchema = typeof InputSchema;
export type DataParseJsonStepOutputSchema = typeof OutputSchema;

export const dataParseJsonStepCommonDefinition: CommonStepDefinition<
  DataParseJsonStepInputSchema,
  DataParseJsonStepOutputSchema,
  DataParseJsonStepConfigSchema
> = {
  id: DataParseJsonStepTypeId,
  category: StepCategory.Data,
  label: i18n.translate('workflowsExtensions.dataParseJsonStep.label', {
    defaultMessage: 'Parse JSON',
  }),
  description: i18n.translate('workflowsExtensions.dataParseJsonStep.description', {
    defaultMessage: 'Parse a JSON string into a structured object or array',
  }),
  documentation: {
    details: `# Parse JSON

Parse a JSON string into a structured object or array for use in downstream steps.

## Basic Usage

\`\`\`yaml
- name: parse-response
  type: data.parseJson
  source: "\${{ steps.http_request.output.body }}"
\`\`\`

## Behavior

- If the source is already a structured type (object, array, number, boolean), it is returned as-is.
- If the source is a valid JSON string, it is parsed and returned.
- If the source is an invalid JSON string, the step returns an error with the parse location.

## Configuration

- **source** (required): The JSON string to parse. Can be a template expression.

## Output

Returns the parsed value — an object, array, string, number, boolean, or null.

## Size Limits

Inputs larger than 10 MB are rejected to prevent excessive memory usage.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
