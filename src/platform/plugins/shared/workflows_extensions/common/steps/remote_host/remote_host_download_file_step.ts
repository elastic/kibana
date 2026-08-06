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

export const RemoteHostDownloadFileStepTypeId = 'remoteHost.downloadFile' as const;

export const ConfigSchema = z.object({
  'connector-id': z.string().min(1),
});

export const InputSchema = z.object({
  remotePath: z.string().min(1),
});

export const OutputSchema = z.object({
  content: z.string(),
});

export type RemoteHostDownloadFileStepConfigSchema = typeof ConfigSchema;
export type RemoteHostDownloadFileStepInputSchema = typeof InputSchema;
export type RemoteHostDownloadFileStepOutputSchema = typeof OutputSchema;

export const remoteHostDownloadFileStepCommonDefinition: CommonStepDefinition<
  RemoteHostDownloadFileStepInputSchema,
  RemoteHostDownloadFileStepOutputSchema,
  RemoteHostDownloadFileStepConfigSchema
> = {
  id: RemoteHostDownloadFileStepTypeId,
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  label: i18n.translate('workflowsExtensions.remoteHostDownloadFileStep.label', {
    defaultMessage: 'Download File',
  }),
  description: i18n.translate('workflowsExtensions.remoteHostDownloadFileStep.description', {
    defaultMessage: 'Download a file from a remote host via SSH',
  }),
  documentation: {
    details: `# Download File

Download a file from a remote host via an SSH Host connector.

## Basic Usage

\`\`\`yaml
- name: fetch-log
  type: remoteHost.downloadFile
  config:
    connector-id: my-ssh-host-connector
  with:
    remotePath: /var/log/myapp/app.log
\`\`\`

## Inputs

- **remotePath** (required): Absolute path on the remote host of the file to download.

## Output

Returns an object with:
- **content**: Text content of the downloaded file.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
