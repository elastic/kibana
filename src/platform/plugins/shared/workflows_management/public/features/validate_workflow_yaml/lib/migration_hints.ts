/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface MigrationHint {
  id: string;
  match: (marker: { message: string }) => boolean;
  glyphClassName: string;
  hoverMessage: string;
}

export const migrationHints: MigrationHint[] = [
  // TODO(https://github.com/elastic/security-team/issues/16526): Remove once the inputs migration to manual trigger is fully complete.
  {
    id: 'root-inputs-removed',
    match: (marker) => marker.message.includes('Property inputs is not allowed'),
    glyphClassName: 'migration-hint-glyph',
    hoverMessage: [
      '**Root-level "inputs" is no longer supported.**',
      '',
      'Move inputs under the manual trigger:',
      '',
      '**Before:**',
      '```yaml',
      'name: My workflow',
      'triggers:',
      '  - type: manual',
      'inputs:           # ❌ ← remove from here',
      '  properties:',
      '    name:',
      '      type: string',
      'steps: ...',
      '```',
      '',
      '**After:**',
      '```yaml',
      'name: My workflow',
      'triggers:',
      '  - type: manual',
      '    inputs:       # ✅ ← move under manual trigger',
      '      properties:',
      '        name:',
      '          type: string',
      'steps: ...',
      '```',
    ].join('\n'),
  },
];
