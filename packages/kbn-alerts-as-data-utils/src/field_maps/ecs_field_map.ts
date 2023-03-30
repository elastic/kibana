/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsFlat } from '@kbn/ecs';
import { EcsMetadata, FieldMap } from './types';

export const ecsFieldMap: FieldMap = Object.keys(EcsFlat).reduce((acc, currKey) => {
  const value: EcsMetadata = EcsFlat[currKey as keyof typeof EcsFlat];
  return {
    ...acc,
    [currKey]: {
      type: value.type,
      array: value.normalize.includes('array'),
      required: !!value.required,
      ...(value.scaling_factor ? { scaling_factor: value.scaling_factor } : {}),
      ...(value.ignore_above ? { ignore_above: value.ignore_above } : {}),
      ...(value.multi_fields ? { multi_fields: value.multi_fields } : {}),
    },
  };
}, {});

export type EcsFieldMap = typeof ecsFieldMap;
