/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dataParseJsonStepCommonDefinition } from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataParseJsonStepDefinition: PublicStepDefinition = {
  ...dataParseJsonStepCommonDefinition,
  label: 'Parse JSON',
  description: 'Parse a JSON string into a structured object or array',
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/document').then(({ icon }) => ({
      default: icon,
    }))
  ),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: `# Parse JSON

Parse a JSON string into a structured object or array for use in downstream steps.

## Basic Usage

\`\`\`yaml
- name: parse-response
  type: data.parse_json
  source: "\${{ steps.http_request.output.body }}"
\`\`\`

## Behavior

- If the source is already a structured type (object, array, number, boolean), it is returned as-is.
- If the source is a valid JSON string, it is parsed and returned.
- If the source is an invalid JSON string, the step returns an error with the parse location.

## Configuration

- **source** (required): The JSON string to parse. Can be a template expression.

## Output

Returns the parsed value — an object, array, string, number, boolean, or null.

## Size Limits

Inputs larger than 10 MB are rejected to prevent excessive memory usage.
`,
  },
};
