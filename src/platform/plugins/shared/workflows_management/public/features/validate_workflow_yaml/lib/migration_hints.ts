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

export interface MigrationHintMatchContext {
  error: YamlValidationResult;
  yamlPath: (string | number)[];
  value: unknown;
  propertyName: string | null;
  yamlDocument: Document | null;
  offset: number;
}

export interface MigrationHint {
  id: string;
  match: (context: MigrationHintMatchContext) => boolean;
  glyphClassName: string;
  hoverMessage: string;
}

export const migrationHints: MigrationHint[] = [
  {
    id: 'scheduled-interval-minimum',
    match: (context) => {
      return (
        context.yamlPath.length === 4 &&
        context.yamlPath.at(0) === 'triggers' &&
        context.yamlPath.at(-1) === 'every' &&
        /^(\d+)([s])$/.test(context.value as string)
      );
    },
    glyphClassName: 'migration-hint-glyph',
    hoverMessage: [
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
  {
    id: 'ai-prompt-output-schema-renamed',
    match: ({ propertyName, yamlDocument, offset }) => {
      if (propertyName !== 'outputSchema' || !yamlDocument) return false;
      const stepNode = getStepNodeAtPosition(yamlDocument, offset);
      return stepNode?.get('type') === 'ai.prompt';
    },
    glyphClassName: 'migration-hint-glyph',
    hoverMessage: [
      '**The `outputSchema` property in `ai.prompt` has been renamed to `schema`.**',
      '',
      'Rename `outputSchema` to `schema` in your `ai.prompt` step.',
      '',
      '**Example:**',
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
];
