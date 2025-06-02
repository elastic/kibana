/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { SelectionDropdown } from '../selection_dropdown';

type ToolbarProps = Pick<ComponentProps<typeof SelectionDropdown>, 'onSelectionChange'>;

export function Toolbar({ onSelectionChange }: ToolbarProps) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <EuiText>
          {i18n.translate('sharedUXPackages.data_pooler.toolbar.query_string', {
            defaultMessage: '4 {entities} | {groupCount} groups',
            values: { groupCount: 20 },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SelectionDropdown onSelectionChange={onSelectionChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
