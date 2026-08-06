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

export const RemoteHostUploadFileStepTypeId = 'remoteHost.uploadFile' as const;

export const ConfigSchema = z.object({
  'connector-id': z.string().min(1),
});

export const InputSchema = z.object({
  remotePath: z.string().min(1),
  content: z.string(),
});

export const OutputSchema = z.null();

export type RemoteHostUploadFileStepConfigSchema = typeof ConfigSchema;
export type RemoteHostUploadFileStepInputSchema = typeof InputSchema;
export type RemoteHostUploadFileStepOutputSchema = typeof OutputSchema;

export const remoteHostUploadFileStepCommonDefinition: CommonStepDefinition<
  RemoteHostUploadFileStepInputSchema,
  RemoteHostUploadFileStepOutputSchema,
  RemoteHostUploadFileStepConfigSchema
> = {
  id: RemoteHostUploadFileStepTypeId,
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  label: i18n.translate('workflowsExtensions.remoteHostUploadFileStep.label', {
    defaultMessage: 'Upload File',
  }),
  description: i18n.translate('workflowsExtensions.remoteHostUploadFileStep.description', {
    defaultMessage: 'Upload a file to a remote host via SSH',
  }),
  documentation: {
    details: `# Upload File

Upload a file to a remote host via an SSH Host connector.

## Basic Usage

\`\`\`yaml
- name: deploy-config
  type: remoteHost.uploadFile
  config:
    connector-id: my-ssh-host-connector
  with:
    remotePath: /etc/myapp/config.json
    content: '{{ steps.build_config.output | json }}'
\`\`\`

## Inputs

- **remotePath** (required): Absolute path on the remote host where the file will be written.
- **content** (required): Text content to write to the file.

## Output

Returns null.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
