/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { GenAiFieldValue } from './genai_field_value';
import { GenAiStructuredValue } from './genai_structured_value';

/** Renders tool arguments or output: structured data as YAML in a code block, text as text. */
export function GenAiToolValue({ value }: { value: unknown }) {
  if (value != null && typeof value === 'object') return <GenAiStructuredValue value={value} />;
  return <GenAiFieldValue value={value ?? ''} />;
}
