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

export const ScriptsJavaScriptStepTypeId = 'code.javascript' as const;

export const ConfigSchema = z.object({});

export const CODE_TEMPLATE_MAX_CHARS = 1024 * 32; // 32 KB template in workflow YAML
export const CODE_MAX_LENGTH_CHARS = 5 * 1024 * 1024; // 5 MB after Liquid template rendering
export const CODE_MEMORY_LIMIT_MB = 10;
export const CODE_EXECUTION_TIMEOUT_MS = 1_000;
export const CODE_MAX_CONSOLE_LOG_COUNT = 100;

export const CODE_TEMPLATE_MAX_KB = CODE_TEMPLATE_MAX_CHARS / 1024;
export const CODE_MAX_LENGTH_MB = CODE_MAX_LENGTH_CHARS / 1024 / 1024;
export const CODE_EXECUTION_TIMEOUT_SECONDS = CODE_EXECUTION_TIMEOUT_MS / 1_000;

export const InputSchema = z.object({
  code: z.string().max(CODE_TEMPLATE_MAX_CHARS),
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

Only **synchronous** code is supported. \`async\`/\`await\`, returning a \`Promise\`, and timers (\`setTimeout\`/\`setInterval\`) are not available; using them fails the step.

## Basic Usage

\`\`\`yaml
- name: compute-value
  type: code.javascript
  with:
    code: |
      return { greeting: 'Hello, World' };
\`\`\`

Scripts run in an isolated sandbox with no runtime context object. Embed workflow data with Liquid in \`with.code\` (rendered before execution). Use \`| json\` for objects and arrays:

\`\`\`yaml
  - name: transform
    type: code.javascript
    with:
      code: |
        const users = {{ steps.fetch_users.output | json }};
        return { label: '{{ consts.greeting }}', count: users.length };
\`\`\`

## Runtime environment

### Available

All standard ECMAScript built-ins that V8 provides:

- **Language features**: \`const\`/\`let\`/\`var\`, destructuring, spread, template literals, optional chaining, nullish coalescing, generator functions (\`function*\`), \`for...of\`, \`try/catch\`, \`class\`, etc.
- **Core objects**: \`Object\`, \`Array\`, \`Function\`, \`Math\`, \`JSON\`, \`Date\`, \`RegExp\`
- **Collections**: \`Map\`, \`Set\`, \`WeakMap\`, \`WeakSet\`
- **Typed data**: \`ArrayBuffer\`, \`DataView\`, \`Int8Array\`, \`Uint8Array\`, \`Float64Array\`, and all other typed arrays
- **Other built-ins**: \`Promise\` (constructable but not awaitable — see restrictions), \`Proxy\`, \`Reflect\`, \`Symbol\`, \`BigInt\`, \`Intl\`, \`Error\` and its subclasses, \`eval\`, \`globalThis\`/\`global\`
- **Console**: \`console.log\`, \`console.info\`, \`console.warn\`, \`console.error\`, \`console.debug\` are routed to the step log. All other \`console.*\` methods (\`table\`, \`dir\`, \`trace\`, etc.) are no-ops.

### Not available

These are platform or runtime APIs — not part of the ECMAScript spec — and are not injected into the sandbox:

| Not available | Why |
|---|---|
| \`async\`/\`await\`, \`return Promise\` | Synchronous execution only; returning a \`Promise\` fails the step |
| \`setTimeout\`, \`setInterval\`, \`clearTimeout\`, \`clearInterval\` | No timer support |
| \`fetch\`, \`XMLHttpRequest\` | No network access |
| \`require\`, \`import()\` | No module loading |
| \`process\`, \`Buffer\`, \`__dirname\`, \`__filename\` | No Node.js APIs |
| \`TextEncoder\`, \`TextDecoder\`, \`URL\`, \`URLSearchParams\` | Web/Node platform APIs |
| \`crypto\` | Web Crypto API |
| \`structuredClone\`, \`queueMicrotask\`, \`performance\` | Web/Node platform APIs |
| \`window\`, \`document\`, \`navigator\` | No browser APIs |

## Limits

| Limit | Value |
|-------|-------|
| Template size (\`with.code\` in YAML) | ${CODE_TEMPLATE_MAX_KB} KB |
| Rendered code size (after Liquid) | ${CODE_MAX_LENGTH_MB} MB |
| Execution timeout | ${CODE_EXECUTION_TIMEOUT_SECONDS} s |
| Memory limit (guest heap) | ${CODE_MEMORY_LIMIT_MB} MB |
| \`console.*\` calls per run | ${CODE_MAX_CONSOLE_LOG_COUNT} (additional logs are dropped) |
| Console message length | 1024 characters (longer messages are truncated) |

The template limit applies to the code as written in the workflow YAML (including \`{{ ... }}\` placeholders). Liquid can expand the code beyond ${CODE_TEMPLATE_MAX_KB} KB at execution time; the rendered code must stay within ${CODE_MAX_LENGTH_MB} MB.

## Inputs

- **code** (required): JavaScript source code to execute (see limits above).

## Output

The step output is the value returned by the script, serialized through \`JSON.stringify\` and then passed to downstream steps. Only JSON-compatible values survive the serialization:

| Returned type | Received by downstream steps |
|---|---|
| Plain object / array / string / number / boolean / \`null\` | Preserved as-is |
| \`Date\` | ISO 8601 string (e.g. \`"2026-01-02T03:04:05.000Z"\`) |
| \`Map\`, \`Set\`, \`RegExp\` | \`{}\` (no own enumerable properties) |
| \`undefined\` (no \`return\` / \`return undefined\`) | \`null\` |
| Function values inside objects | Silently dropped |
| \`BigInt\` | Step fails (\`JSON.stringify\` rejects \`BigInt\`) |
| Circular reference | Step fails (detected before serialization) |
| Object keys named \`__proto__\`, \`constructor\`, or \`prototype\` | Stripped (prototype-pollution prevention) |
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
