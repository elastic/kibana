/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { getStepNodeAtPosition } from '../../../../common/lib/yaml';
import type { YamlValidationResult } from '../model/types';

export interface MigrationMatchContext {
  error: YamlValidationResult;
  yamlPath: (string | number)[];
  value: unknown;
  propertyName: string | null;
  yamlDocument: Document | null;
  offset: number;
}

export interface Migration {
  id: string;
  name: string;
  match: (context: MigrationMatchContext) => boolean;
  description: string;
}

type MigrationDefinition = Omit<Migration, 'id'>;

const migrationDefinitions: Record<string, MigrationDefinition> = {
  'scheduled-interval-minimum': {
    name: 'Scheduled interval minimum increased to 1 minute',
    match: (context) => {
      return (
        context.yamlPath.length === 4 &&
        context.yamlPath.at(0) === 'triggers' &&
        context.yamlPath.at(-1) === 'every' &&
        /^(\d+)([s])$/.test(context.value as string)
      );
    },
    description: [
      '**The minimum scheduled interval has been increased to 1 minute.**',
      '',
      'Intervals shorter than 1 minute (e.g. `30s`) are no longer allowed. Update your `every` value to at least `1m` (or `60s`).',
      '',
      '**Accepted formats:**',
      '- `1m`, `5m`, `30m` — minutes',
      '- `60s`, `90s`, `120s` — seconds (minimum 60)',
      '- `1h`, `2h` — hours',
      '- `1d` — days',
      '',
      '**Example:**',
      '```yaml',
      'triggers:',
      '  - type: scheduled',
      '    with:',
      '      every: "1m"  # ✅ minimum 1 minute',
      '```',
    ].join('\n'),
  },
  'ai-prompt-output-schema-renamed': {
    name: 'outputSchema renamed to schema in ai.prompt',
    match: ({ propertyName, yamlDocument, offset }) => {
      if (propertyName !== 'outputSchema' || !yamlDocument) return false;
      const stepNode = getStepNodeAtPosition(yamlDocument, offset);
      return stepNode?.get('type') === 'ai.prompt';
    },
    description: [
      '**The `outputSchema` property in `ai.prompt` has been renamed to `schema`.**',
      '',
      'Rename `outputSchema` to `schema` in your `ai.prompt` step.',
      '',
      '**Before (invalid):**',
      '```yaml',
      '- name: Categorize alert',
      '  type: ai.prompt',
      '  with:',
      '    outputSchema:       # ❌ no longer supported',
      '      type: object',
      '      properties:',
      '        category:',
      '          type: string',
      '        severity:',
      '          type: integer',
      '    prompt: Categorize the following alert...',
      '```',
      '',
      '**After (valid):**',
      '```yaml',
      '- name: Categorize alert',
      '  type: ai.prompt',
      '  with:',
      '    schema:              # ✅ renamed from outputSchema',
      '      type: object',
      '      properties:',
      '        category:',
      '          type: string',
      '        severity:',
      '          type: integer',
      '    prompt: Categorize the following alert...',
      '```',
    ].join('\n'),
  },
};

export const migrations: Record<string, Migration> = Object.fromEntries(
  Object.entries(migrationDefinitions).map(([key, def]) => [key, { ...def, id: key }])
);
