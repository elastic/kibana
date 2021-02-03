/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getFilterableKbnTypeNames } from '../../kbn_field_types';
import { IFieldType } from './types';

const filterableTypes = getFilterableKbnTypeNames();

export function isFilterable(field: IFieldType): boolean {
  return (
    field.name === '_id' ||
    field.scripted ||
    Boolean(field.searchable && filterableTypes.includes(field.type))
  );
}

export function isNestedField(field: IFieldType): boolean {
  return !!field.subType?.nested;
}
