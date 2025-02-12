/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldIconProps } from './field_icon';
import { getFieldIconType } from '../../utils/get_field_icon_type';
import type { FieldBase } from '../../types';

export function getFieldIconProps<T extends FieldBase = DataViewField>(field: T): FieldIconProps {
  return {
    type: getFieldIconType(field),
    scripted: field.scripted,
  };
}
