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

export const RemoteHostRunCommandStepTypeId = 'remoteHost.runCommand' as const;

export const REMOTE_HOST_COMMAND_TEMPLATE_MAX_CHARS = 1024 * 32; // 32 KB

export const ConfigSchema = z.object({
  'connector-id': z.string().min(1),
});

export const InputSchema = z.object({
  code: z.string().max(REMOTE_HOST_COMMAND_TEMPLATE_MAX_CHARS),
});

export const OutputSchema = z.unknown();

export type RemoteHostRunCommandStepConfigSchema = typeof ConfigSchema;
export type RemoteHostRunCommandStepInputSchema = typeof InputSchema;
export type RemoteHostRunCommandStepOutputSchema = typeof OutputSchema;

export const remoteHostRunCommandStepCommonDefinition: CommonStepDefinition<
  RemoteHostRunCommandStepInputSchema,
  RemoteHostRunCommandStepOutputSchema,
  RemoteHostRunCommandStepConfigSchema
> = {
  id: RemoteHostRunCommandStepTypeId,
  category: StepCategory.Kibana,
  // stability: 'tech_preview',
  label: i18n.translate('workflowsExtensions.remoteHostRunCommandStep.label', {
    defaultMessage: 'Run Command',
  }),
  description: i18n.translate('workflowsExtensions.remoteHostRunCommandStep.description', {
    defaultMessage: 'Execute a shell command on a remote host via SSH and return its output',
  }),
  documentation: {
    details: `# Run Command

Execute a shell command on a remote host via an SSH Host connector. The script can set
\`SCRIPT_OUTPUT\` to a string or JSON value — that value becomes the step output.
Standard output and stderr are captured to logs.

## Basic Usage

\`\`\`yaml
- name: get-hostname
  type: remoteHost.runCommand
  config:
    connector-id: my-ssh-host-connector
  with:
    code: |
      SCRIPT_OUTPUT=$(hostname -f)
\`\`\`

## Structured Output

\`\`\`yaml
- name: disk-info
  type: remoteHost.runCommand
  config:
    connector-id: my-ssh-host-connector
  with:
    code: |
      AVAILABLE=$(df -BG / | awk 'NR==2{print $4}')
      SCRIPT_OUTPUT="{\"available\": \"$AVAILABLE\"}"
\`\`\`

## Inputs

- **code** (required): Shell script to execute on the remote host.

## Output

Returns the value of \`SCRIPT_OUTPUT\` set by the script. If the value is valid JSON it is
parsed into an object; otherwise it is returned as a string. Returns \`null\` when
\`SCRIPT_OUTPUT\` is not set.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
