/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsFlat } from '@elastic/ecs';
import type { EsHitRecord } from '../types';

function getEcsCategoryByFieldName(field: string): string | undefined {
  if (field in EcsFlat) {
    const fieldNameParts = field.split('.');
    return fieldNameParts.length > 1 ? fieldNameParts[0] : 'base';
  }
}

export function getEcsCategoriesArrByFieldName(fieldNameArr: string[]): string[] {
  const ecsFields = new Map<string, any>();
  for (const field of fieldNameArr) {
    const category = getEcsCategoryByFieldName(field);
    if (category) {
      if (!ecsFields.has(category)) {
        ecsFields.set(category, [field]);
      } else {
        const newArr = [...ecsFields.get(category), field];
        ecsFields.set(category, newArr);
      }
    }
  }
  return [...ecsFields.keys()];
}

/**
 * A quick function to mutate the given doc and add the ECS categories to it
 * Just quick for POC purpose, sorry for the mutation!
 * @param doc
 */
export function applyEcsCategoryInformation(doc: EsHitRecord) {
  if (!doc.fields) {
    return [];
  }
  const ecsCategories = getEcsCategoriesArrByFieldName(Object.keys(doc.fields));
  if (ecsCategories.length > 0) {
    doc._ecs = ecsCategories;
  }
  return ecsCategories;
}
