/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MenuItemGroup } from '../types';

export function Group({ group }: { group: MenuItemGroup }) {
  return (
    <>
      <EuiTitle id={`${group.id}-group`} size="xxs">
        <h3>{group.title}</h3>
      </EuiTitle>
      <EuiListGroup
        aria-labelledby={`${group.id}-group`}
        size="s"
        gutterSize="none"
        maxWidth={false}
        flush
      >
        {group.items.map((item) => {
          return (
            <EuiListGroupItem
              key={item.id}
              label={
                <EuiToolTip position="right" content={item.description}>
                  {!item.isDeprecated ? (
                    <EuiText size="s">{item.name}</EuiText>
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
                  )}
                </EuiToolTip>
              }
              onClick={item.onClick}
              iconType={item.icon}
              data-test-subj={item['data-test-subj']}
              isDisabled={item.isDisabled}
            />
          );
        })}
      </EuiListGroup>
    </>
  );
}
