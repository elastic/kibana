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

export const ScriptsJavaScriptStepTypeId = 'scripts.javaScript' as const;

export const ConfigSchema = z.object({});

export const SCRIPT_TEMPLATE_MAX_CHARS = 1024 * 128; // 128 KB template in workflow YAML

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
  type: scripts.javaScript
  with:
    script: |
      return { greeting: 'Hello, World' };
\`\`\`

Scripts run in an isolated sandbox. **Workflow context is not available inside the running script** (there is no \`context\`, \`input\`, or \`steps\` global at runtime). Inject data by embedding **Liquid template expressions** in \`with.script\`. The workflow engine renders the template **before** execution, producing the final JavaScript source that runs in the isolate.

## Injecting workflow context

Use the same Liquid variables as other workflow steps. Common namespaces:

| Namespace | Example | Use for |
|-----------|---------|---------|
| \`consts\` | \`{{ consts.apiUrl }}\` | Workflow-level constants from \`consts:\` in YAML |
| \`steps\` | \`{{ steps.fetch_users.output }}\` | Prior step outputs (\`output\`, and \`error\` when failed) |
| \`inputs\` | \`{{ inputs.ticketId }}\` | Manual / workflow-call trigger inputs |
| \`workflow\` | \`{{ workflow.name }}\` | Workflow metadata (id, name, spaceId, startedAt, …) |
| \`execution\` | \`{{ execution.id }}\` | Current workflow execution metadata |
| \`event\` | \`{{ event.rule.id }}\` | Trigger event payload (alerts, scheduled runs, …) |
| \`foreach\` | \`{{ foreach.item.id }}\` | Current item when the step runs inside \`foreach\` |
| \`while\` | \`{{ while.iteration }}\` | Loop iteration when inside \`while\` |

**Objects and arrays** — use the \`json\` filter so Liquid emits valid JavaScript literals:

\`\`\`yaml
consts:
  thresholds: [10, 20, 30]

steps:
  - name: enrich-from-consts
    type: scripts.javaScript
    with:
      script: |
        const thresholds = {{ consts.thresholds | json }};
        return thresholds.map((n) => n * 2);
\`\`\`

**Prior step output:**

\`\`\`yaml
  - name: transform-users
    type: scripts.javaScript
    with:
      script: |
        const users = {{ steps.fetch_users.output | json }};
        return users.filter((user) => user.active);
\`\`\`

**Strings and mixed literals** — wrap Liquid in JavaScript quotes where needed:

\`\`\`yaml
consts:
  greeting: Hello from consts

steps:
  - name: build-greeting
    type: scripts.javaScript
    with:
      script: |
        return {
          greeting: '{{ consts.greeting }}',
          nested: { ok: true, items: [1, 2, 3] },
        };
\`\`\`

**Inside \`foreach\`:**

\`\`\`yaml
  - name: process-item
    type: scripts.javaScript
    foreach: '{{ steps.fetch_items.output }}'
    with:
      script: |
        const item = {{ foreach.item | json }};
        const index = {{ foreach.index }};
        return { index, id: item.id };
\`\`\`

Keep embedded data small. Large \`{{ steps.*.output | json }}\` expansions count toward the post-render size limit below.

## Size limits

- **Template (\`with.script\` in YAML):** max 128 KB — the script source as authored, including Liquid placeholders.
- **After rendering:** max 1 MB — the script after Liquid expands \`{{ ... }}\` expressions at execution time. A short template can exceed 128 KB once rendered; the server rejects scripts larger than 1 MB before execution.

## Inputs

- **script** (required): JavaScript source code to execute (max 128 KB in the workflow definition; max 1 MB after template rendering).

## Output

Returns the value produced by the script. The output schema is dynamic and depends on what the script returns.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
