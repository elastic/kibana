/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListItem, GetCustomFieldType } from '../../types';
import { getFieldType } from './get_field_type';

/**
 * Returns an icon type for a field
 * @param field
 * @param getCustomFieldType
 * @public
 */
export function getFieldIconType<T extends FieldListItem = DataViewField>(
  field: T,
  getCustomFieldType?: GetCustomFieldType<T>
): string {
  const type = getCustomFieldType ? getCustomFieldType(field) : getFieldType<T>(field);
  const esType = field.esTypes?.[0] || null;
  if (esType && ['_id', '_index'].includes(esType) && type === 'string') {
    return 'keyword';
  }
  return type === 'string' && esType ? esType : type;
}
