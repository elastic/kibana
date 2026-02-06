/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dataDedupeStepCommonDefinition } from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataDedupeStepDefinition: PublicStepDefinition = {
  ...dataDedupeStepCommonDefinition,
  label: 'Deduplicate Collection',
  description: 'Remove duplicate items from a collection based on unique keys',
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/filter').then(({ icon }) => ({
      default: icon,
    }))
  ),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: `# Deduplicate Collection

Remove duplicate items from an array based on one or more unique key fields.

## Basic Usage

\`\`\`yaml
- name: unique-users
  type: data.dedupe
  items: "\${{ steps.fetch_users.output }}"
  strategy: "keep_first"
  with:
    keys: 
      - "email"
\`\`\`

## Examples

### Single Key Deduplication

Remove duplicates based on a single field:

\`\`\`yaml
- name: unique-emails
  type: data.dedupe
  items: "\${{ steps.get_recipients.output }}"
  with:
    keys: 
      - "email"
\`\`\`

### Multiple Key Deduplication

Remove duplicates based on a combination of fields:

\`\`\`yaml
- name: unique-user-events
  type: data.dedupe
  items: "\${{ steps.fetch_events.output }}"
  strategy: "keep_first"
  with:
    keys:
      - "user_id"
      - "event_type"
\`\`\`

### Keep Last Strategy

Keep the last occurrence instead of the first:

\`\`\`yaml
- name: latest-status-per-user
  type: data.dedupe
  items: "\${{ steps.fetch_status_updates.output }}"
  strategy: "keep_last"
  with:
    keys:
      - "user_id"
\`\`\`

## Configuration

- **items** (required): Array of items to deduplicate
- **keys** (required): Array of field names to use for uniqueness check
- **strategy** (optional): 
  - \`keep_first\` (default): Keep the first occurrence of each unique combination
  - \`keep_last\`: Keep the last occurrence of each unique combination

## Output

Returns an array with duplicate items removed based on the specified keys.

## Notes

- If a key doesn't exist in an item, it's treated as \`undefined\` for comparison
- Empty arrays are returned as-is
- The order of items is preserved (relative to the chosen strategy)
`,
  },
};
