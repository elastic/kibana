/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsFlat } from '@kbn/ecs';
import { EcsMetadata, FieldMap } from './types';

const EXCLUDED_TYPES = ['constant_keyword'];

let dateStart = Date.now();

/*
export const ecsFieldMap: FieldMap = Object.keys(EcsFlat).reduce((acc, currKey) => {
  const value: EcsMetadata = EcsFlat[currKey as keyof typeof EcsFlat];

  // Exclude excluded types
  if (EXCLUDED_TYPES.includes(value.type)) {
    return acc;
  }

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

console.log('ecsFieldMap built old way: ', Date.now() - dateStart);
*/

dateStart = Date.now();

export const ecsFieldMap: FieldMap = Object.fromEntries(
  Object.entries(EcsFlat)
    .filter(([_, value]) => !EXCLUDED_TYPES.includes(value.type))
    .map(([key, _]) => {
      const value: EcsMetadata = EcsFlat[key as keyof typeof EcsFlat];
      return [
        key,
        {
          type: value.type,
          array: value.normalize.includes('array'),
          required: !!value.required,
          ...(value.scaling_factor ? { scaling_factor: value.scaling_factor } : {}),
          ...(value.ignore_above ? { ignore_above: value.ignore_above } : {}),
          ...(value.multi_fields ? { multi_fields: value.multi_fields } : {}),
        },
      ];
    })
);

console.log('ecsFieldMap built new way: ', Date.now() - dateStart);

export type EcsFieldMap = typeof ecsFieldMap;
