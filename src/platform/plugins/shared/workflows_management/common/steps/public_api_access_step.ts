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
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

export const PublicApiAccessStepTypeId = 'workflows.publicApiAccess' as const;

export const PublicApiAccessInputSchema = z.object({
  ttl: z
    .string()
    .optional()
    .describe('Short-lived API key lifetime (for example "1h"). Defaults to 1h, max 24h.'),
});

export const PublicApiAccessOutputSchema = z.object({
  apiKeyId: z.string(),
  resumeUrl: z.string(),
  ttl: z.string(),
  expiresAt: z.string().optional(),
});

export type PublicApiAccessStepInput = z.infer<typeof PublicApiAccessInputSchema>;
export type PublicApiAccessStepOutput = z.infer<typeof PublicApiAccessOutputSchema>;

export const publicApiAccessStepCommonDefinition: CommonStepDefinition<
  typeof PublicApiAccessInputSchema,
  typeof PublicApiAccessOutputSchema
> = {
  id: PublicApiAccessStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.translate('workflowsManagement.publicApiAccessStep.label', {
    defaultMessage: 'Public API access',
  }),
  description: i18n.translate('workflowsManagement.publicApiAccessStep.description', {
    defaultMessage:
      'Create short-lived credentials for unauthenticated public Workflows API access (for example external resume links).',
  }),
  inputSchema: PublicApiAccessInputSchema,
  outputSchema: PublicApiAccessOutputSchema,
  documentation: {
    details: `# Public API access

Mint a short-lived API key and external resume URL for the current workflow execution.

## Example

\`\`\`yaml
- name: mint-public-access
  type: workflows.publicApiAccess
  with:
    ttl: 1h

- name: notify-slack
  type: slack_api
  with:
    message: "Approve: {{ steps.mint-public-access.output.resumeUrl }}&approved=true"

- name: approval
  type: waitForInput
  with:
    externalResumeApiKeyId: "{{ steps.mint-public-access.output.apiKeyId }}"
    schema:
      properties:
        approved:
          type: boolean
      required:
        - approved
\`\`\`
`,
  },
};
