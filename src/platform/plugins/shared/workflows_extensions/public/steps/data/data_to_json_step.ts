/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dataToJsonStepCommonDefinition } from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataToJsonStepDefinition: PublicStepDefinition = {
  ...dataToJsonStepCommonDefinition,
  label: 'To JSON String',
  description: 'Convert a structured object or array to a JSON string',
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/document').then(({ icon }) => ({
      default: icon,
    }))
  ),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: `# To JSON String

Convert a structured value (object, array, etc.) into a JSON string for transport or presentation.

## Basic Usage

\`\`\`yaml
- name: stringify-payload
  type: data.to_json
  source: "\${{ steps.build_payload.output }}"
  with:
    pretty: false
\`\`\`

## Pretty Print

\`\`\`yaml
- name: debug-output
  type: data.to_json
  source: "\${{ steps.build_payload.output }}"
  with:
    pretty: true
\`\`\`

## Configuration

- **source** (required): The value to stringify. Can be any structured type.
- **pretty** (optional, default: false): When true, outputs indented JSON with 2-space indentation.

## Output

Returns a JSON string representation of the source value.

## Error Handling

- Circular references produce a clear error message.
- Non-serializable values (e.g., functions) return an error.
`,
  },
};
