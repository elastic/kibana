/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dataConcatStepCommonDefinition } from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataConcatStepDefinition: PublicStepDefinition = {
  ...dataConcatStepCommonDefinition,
  label: 'Concat Arrays',
  description: 'Combine multiple arrays into a single array',
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/merge').then(({ icon }) => ({
      default: icon,
    }))
  ),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: `# Concat Arrays

Combine multiple arrays into a single array, preserving order.

## Basic Usage

\`\`\`yaml
- name: merge-tags
  type: data.concat
  arrays:
    - "\${{ inputs.user_tags }}"
    - ["policy:all", "automated"]
    - "\${{ steps.fetch_defaults.output }}"
\`\`\`

## With Deduplication

\`\`\`yaml
- name: unique-recipients
  type: data.concat
  arrays:
    - "\${{ steps.team_a.output.emails }}"
    - "\${{ steps.team_b.output.emails }}"
  with:
    dedupe: true
\`\`\`

## With Flattening

\`\`\`yaml
- name: flatten-nested
  type: data.concat
  arrays:
    - [["a", "b"], ["c"]]
    - [["d"]]
  with:
    flatten: true
\`\`\`

## Configuration

- **arrays** (required): Array of arrays to concatenate (max 50). Each entry must resolve to an array. Null/undefined entries are treated as empty arrays.
- **dedupe** (optional, default: false): Remove duplicate items, keeping first occurrence. Primitives are compared by value; objects by deep equality.
- **flatten** (optional, default: false): Flatten nested arrays. Use \`true\` for 1 level, or a number (1-10) for specific depth.

## Output

Returns a single array containing all items from the input arrays in order.

## Limits

- Maximum 50 input arrays
- Maximum 100,000 total items in the result
`,
  },
};
