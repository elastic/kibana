/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import type { RuntimePrimitiveTypes } from '../../../shared_imports';

export const defaultValueFormatter = (value: unknown) => {
  const content = typeof value === 'object' ? JSON.stringify(value) : String(value) ?? '-';
  return renderToString(<>{content}</>);
};

export const valueTypeToSelectedType = (value: unknown): RuntimePrimitiveTypes => {
  const valueType = typeof value;
  if (valueType === 'string') return 'keyword';
  if (valueType === 'number') return 'double';
  if (valueType === 'boolean') return 'boolean';
  return 'keyword';
};

