/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FieldIcon as KbnFieldIcon, FieldIconProps as KbnFieldIconProps } from '@kbn/react-field';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldListItem } from '../../types';
import { getFieldIconType } from '../../utils/field_types';

export type FieldIconProps = KbnFieldIconProps;

export const FieldIcon: React.FC<FieldIconProps> = ({ type, ...rest }) => {
  return <KbnFieldIcon type={normalizeFieldType(type)} {...rest} />;
};

export function getFieldIconProps<T extends FieldListItem = DataViewField>(
  field: T
): FieldIconProps {
  return {
    type: getFieldIconType(field),
    scripted: field.scripted,
  };
}

function normalizeFieldType(type: string) {
  if (type === 'histogram') {
    return 'number';
  }
  return type === 'document' ? 'number' : type;
}
