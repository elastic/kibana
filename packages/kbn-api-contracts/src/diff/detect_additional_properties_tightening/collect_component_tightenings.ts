/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { isRecord } from '../is_record';
import { collectTighteningsInSchemaDiff } from './collect_tightenings_in_schema_diff';
import type { ComponentTightening } from './types';

export const collectComponentTightenings = (structuralDiff: unknown): ComponentTightening[] => {
  const modifiedSchemas = get(structuralDiff, ['components', 'schemas', 'modified']);
  if (!isRecord(modifiedSchemas)) return [];

  return Object.entries(modifiedSchemas)
    .map(([componentName, schemaDiff]) => ({
      componentName,
      pointers: collectTighteningsInSchemaDiff(schemaDiff, ''),
    }))
    .filter(({ pointers }) => pointers.length > 0);
};
