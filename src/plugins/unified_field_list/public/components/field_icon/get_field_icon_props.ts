/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataViewField } from '@kbn/data-views-plugin/common';
import { FieldListItem } from '../../types';
import { getFieldIconType } from '../../utils/field_types';
import { type FieldIconProps } from './field_icon';

export function getFieldIconProps<T extends FieldListItem = DataViewField>(
  field: T
): FieldIconProps {
  return {
    type: getFieldIconType(field),
    scripted: field.scripted,
  };
}
