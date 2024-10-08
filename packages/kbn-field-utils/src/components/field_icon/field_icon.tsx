/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FieldIcon as KbnFieldIcon, FieldIconProps as KbnFieldIconProps } from '@kbn/react-field';
import { getFieldTypeName } from '../../utils/get_field_type_name';

export type FieldIconProps = KbnFieldIconProps;

const InnerFieldIcon: React.FC<FieldIconProps> = ({ type, ...rest }) => {
  return <KbnFieldIcon type={normalizeFieldType(type)} label={getFieldTypeName(type)} {...rest} />;
};

export type GenericFieldIcon = typeof InnerFieldIcon;
const FieldIcon = React.memo(InnerFieldIcon) as GenericFieldIcon;

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldIcon;

function normalizeFieldType(type: string) {
  return type === 'document' ? 'number' : type;
}
