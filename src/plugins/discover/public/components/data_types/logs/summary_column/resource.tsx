/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { EuiBadge, EuiBadgeGroup, EuiFlexGroup, EuiFlexGroupProps } from '@elastic/eui';
import { ResourceFieldDescriptor, createResourceFields } from './utils';
import { FieldBadgeWithActions } from '../cell_actions_popover';

const MAX_LIMITED_FIELDS_VISIBLE = 3;

interface ResourceProps extends DataGridCellValueElementProps {
  /* When true, the column will render a predefined number of resources and indicates with a badge how many more we have */
  limited?: boolean;
  alignItems?: EuiFlexGroupProps['alignItems'];
}

export const Resource = ({ row, limited = false, alignItems = 'stretch' }: ResourceProps) => {
  const resourceFields = createResourceFields(row);

  const displayedFields = limited
    ? resourceFields.slice(0, MAX_LIMITED_FIELDS_VISIBLE)
    : resourceFields;
  const extraFieldsCount = limited ? resourceFields.length - MAX_LIMITED_FIELDS_VISIBLE : 0;

  return (
    <EuiFlexGroup gutterSize="s" css={{ height: '100%' }} alignItems={alignItems}>
      {displayedFields.map(({ name, value, Icon }) => (
        <FieldBadgeWithActions key={name} property={name} text={value} icon={Icon} />
      ))}
      {extraFieldsCount > 0 && (
        <div>
          <EuiBadge>+{extraFieldsCount}</EuiBadge>
        </div>
      )}
    </EuiFlexGroup>
  );
};

export const StaticResource = ({ fields }: { fields: ResourceFieldDescriptor[] }) => {
  return (
    <EuiBadgeGroup gutterSize="s">
      {fields.map(({ name, value, Icon }) => (
        <EuiBadge key={name} color="hollow" iconType={Icon} iconSide="left">
          {value}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};
