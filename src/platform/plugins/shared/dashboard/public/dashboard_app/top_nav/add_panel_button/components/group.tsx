/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiText,
  EuiTitle,
  type EuiListGroupProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MenuItemGroup } from '../types';

export function Group({ group }: { group: MenuItemGroup }) {
  const listItems: EuiListGroupProps['listItems'] = useMemo(
    () =>
      group.items.map((item) => ({
        key: item.id,
        size: 's',
        toolTipText: item.description,
        toolTipProps: {
          position: 'right',
        },
        showToolTip: true,
        label: !item.isDeprecated ? (
          item.name
        ) : (
          <EuiFlexGroup wrap responsive={false} gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s">{item.name}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                <FormattedMessage
                  id="dashboard.editorMenu.deprecatedTag"
                  defaultMessage="Deprecated"
                />
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        onClick: item.onClick,
        iconType: item.icon,
        isDisabled: item.isDisabled,
        'data-test-subj': item['data-test-subj'],
        role: 'menuitem',
      })),
    [group.items]
  );

  const titleId = `${group.id}-group`;

  return (
    <>
      <EuiTitle size="xxs">
        <h3 id={titleId}>{group.title}</h3>
      </EuiTitle>
      <EuiListGroup
        aria-labelledby={titleId}
        size="s"
        gutterSize="none"
        maxWidth={false}
        flush
        listItems={listItems}
        role="menu"
      />
    </>
  );
}
