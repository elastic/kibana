/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { FieldIcon, FieldIconProps } from '../field_icon';

export interface FieldNameWithIconProps {
  name: string;
  type?: FieldIconProps['type'];
}

export const FieldNameWithIcon = ({ name, type }: FieldNameWithIconProps) => {
  return type ? (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <FieldIcon type={type} />
      {name}
    </EuiFlexGroup>
  ) : (
    name
  );
};
