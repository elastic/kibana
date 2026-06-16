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

export const ScriptsJavaScriptStepTypeId = 'scripts.javascript' as const;

export const ConfigSchema = z.object({});

export const SCRIPT_TEMPLATE_MAX_CHARS = 1024 * 32; // 32 KB template in workflow YAML
export const SCRIPT_MAX_LENGTH_CHARS = 1 * 1024 * 1024; // 1 MB after Liquid template rendering
export const SCRIPT_MEMORY_LIMIT_MB = 8;
export const SCRIPT_EXECUTION_TIMEOUT_MS = 1_000;
export const MAX_CONSOLE_LOG_COUNT = 100;

export const SCRIPT_TEMPLATE_MAX_KB = SCRIPT_TEMPLATE_MAX_CHARS / 1024;
export const SCRIPT_MAX_LENGTH_MB = SCRIPT_MAX_LENGTH_CHARS / 1024 / 1024;
export const SCRIPT_EXECUTION_TIMEOUT_SECONDS = SCRIPT_EXECUTION_TIMEOUT_MS / 1_000;

export const InputSchema = z.object({
  script: z.string().max(SCRIPT_TEMPLATE_MAX_CHARS),
});

export const OutputSchema = z.unknown();

export type ScriptsJavaScriptStepConfigSchema = typeof ConfigSchema;
export type ScriptsJavaScriptStepInputSchema = typeof InputSchema;
export type ScriptsJavaScriptStepOutputSchema = typeof OutputSchema;

export const scriptsJavaScriptStepCommonDefinition: CommonStepDefinition<
  ScriptsJavaScriptStepInputSchema,
  ScriptsJavaScriptStepOutputSchema,
  ScriptsJavaScriptStepConfigSchema
> = {
  id: ScriptsJavaScriptStepTypeId,
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  label: i18n.translate('workflowsExtensions.scriptsJavaScriptStep.label', {
    defaultMessage: 'Run JavaScript',
  }),
  description: i18n.translate('workflowsExtensions.scriptsJavaScriptStep.description', {
    defaultMessage: 'Execute a JavaScript script and return its result',
  }),
  documentation: {
    details: `# Run JavaScript

Execute a JavaScript script in a sandboxed runtime and return its result to downstream steps.

## Basic Usage

\`\`\`yaml
- name: compute-value
  type: scripts.javascript
  with:
    script: |
      return { greeting: 'Hello, World' };
\`\`\`

Scripts run in an isolated sandbox with no runtime context object. Embed workflow data with Liquid in \`with.script\` (rendered before execution). Use \`| json\` for objects and arrays:

\`\`\`yaml
  - name: transform
    type: scripts.javascript
    with:
      script: |
        const users = {{ steps.fetch_users.output | json }};
        return { label: '{{ consts.greeting }}', count: users.length };
\`\`\`

## Limits

| Limit | Value |
|-------|-------|
| Template size (\`with.script\` in YAML) | ${SCRIPT_TEMPLATE_MAX_KB} KB |
| Rendered script size (after Liquid) | ${SCRIPT_MAX_LENGTH_MB} MB |
| Execution timeout | ${SCRIPT_EXECUTION_TIMEOUT_SECONDS} s |
| Isolate memory | ${SCRIPT_MEMORY_LIMIT_MB} MB |
| \`console.*\` calls per run | ${MAX_CONSOLE_LOG_COUNT} (additional logs are dropped) |

The template limit applies to the script as written in the workflow YAML (including \`{{ ... }}\` placeholders). Liquid can expand the script beyond ${SCRIPT_TEMPLATE_MAX_KB} KB at execution time; the rendered script must stay within ${SCRIPT_MAX_LENGTH_MB} MB.

## Inputs

- **script** (required): JavaScript source code to execute (see limits above).

## Output

Returns the value produced by the script. The output schema is dynamic and depends on what the script returns.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
