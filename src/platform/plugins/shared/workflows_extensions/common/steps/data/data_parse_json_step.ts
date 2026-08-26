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

export const MAX_PARSE_JSON_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_PARSE_JSON_SOURCE_MB = MAX_PARSE_JSON_SOURCE_BYTES / (1024 * 1024);

export const ConfigSchema = z.object({
  source: z.unknown().describe(
    i18n.translate('workflowsExtensions.dataParseJsonStep.schema.source', {
      defaultMessage:
        'JSON string to parse. Can be a template expression. If the value is already a structured type (object, array, number, boolean), it is returned as-is.',
    })
  ),
});

export const InputSchema = z.object({});

export const OutputSchema = z.unknown().describe(
  i18n.translate('workflowsExtensions.dataParseJsonStep.schema.output', {
    defaultMessage:
      'The parsed value: an object, array, string, number, boolean, or null. Already-structured sources are returned unchanged.',
  })
);

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
    details: i18n.translate('workflowsExtensions.dataParseJsonStep.documentation.details', {
      defaultMessage:
        'Parse a JSON string into a structured object or array for use in downstream steps.',
    }),
    notes: [
      i18n.translate('workflowsExtensions.dataParseJsonStep.documentation.notes.invalidJson', {
        defaultMessage:
          'Invalid JSON fails the step. The error includes the parse location from the JSON parser.',
      }),
      i18n.translate('workflowsExtensions.dataParseJsonStep.documentation.notes.sizeLimit', {
        defaultMessage:
          'Inputs larger than {maxMb} MB are rejected to prevent excessive memory usage.',
        values: { maxMb: MAX_PARSE_JSON_SOURCE_MB },
      }),
      i18n.translate('workflowsExtensions.dataParseJsonStep.documentation.notes.liquid', {
        defaultMessage:
          'For inline parsing inside a Liquid expression, use the json_parse Liquid filter. Use data.parseJson when you want the parsed result as a separate named step output.',
      }),
    ],
    examples: [
      `## Basic usage
\`\`\`yaml
- name: parse-response
  type: data.parseJson
  source: "\${{ steps.http_request.output.body }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
