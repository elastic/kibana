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

export const SshRunStepTypeId = 'ssh.run' as const;

const REMOTE_HOST_COMMAND_TEMPLATE_MAX_CHARS = 1024 * 32; // 32 KB

export const ConfigSchema = z.object({
  'connector-id': z.string().min(1),
});

export const InputSchema = z.object({
  command: z.string().max(REMOTE_HOST_COMMAND_TEMPLATE_MAX_CHARS),
  env: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string()).optional(),
  cwd: z.string().optional(),
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
  id: SshRunStepTypeId,
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  label: i18n.translate('workflowsExtensions.remoteHostRunCommandStep.label', {
    defaultMessage: 'Run Command',
  }),
  description: i18n.translate('workflowsExtensions.remoteHostRunCommandStep.description', {
    defaultMessage: 'Execute a shell command on a remote host via SSH and return its output',
  }),
  documentation: {
    details: `# Run Command

Execute a shell command on a remote host via an SSH connector. Write the step result
to the file at \`$STEP_OUTPUT\` (string or JSON). That file content becomes the step
output. Standard output and stderr are captured to logs.

## Basic Usage

\`\`\`yaml
- name: get-hostname
  type: ssh.run
  config:
    connector-id: my-ssh-connector
  with:
    command: |
      printf '%s' "$(hostname -f)" > "$STEP_OUTPUT"
\`\`\`

## Structured Output

\`\`\`yaml
- name: disk-info
  type: ssh.run
  config:
    connector-id: my-ssh-connector
  with:
    command: |
      AVAILABLE=$(df -BG / | awk 'NR==2{print $4}')
      printf '{"available": "%s"}' "$AVAILABLE" > "$STEP_OUTPUT"
\`\`\`

## Environment Variables and Working Directory

\`\`\`yaml
- name: deploy
  type: ssh.run
  config:
    connector-id: my-ssh-connector
  with:
    cwd: /opt/myapp
    env:
      DEPLOY_ENV: production
    command: |
      echo "Deploying to $DEPLOY_ENV"
\`\`\`

## Inputs

- **command** (required): Shell command to execute on the remote host.
- **env** (optional): Key-value map of environment variables exported before \`command\` runs. Keys must be valid shell identifiers.
- **cwd** (optional): Working directory for \`command\`.

## Output

Returns the contents of the file at \`$STEP_OUTPUT\`. If the value is valid JSON it is
parsed into an object; otherwise it is returned as a string. Returns \`null\` when
the file is empty.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
