/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Group } from './group';
import { MenuItemGroup } from '../types';

export function Groups({ groups }: { groups: MenuItemGroup[] }) {
  return groups.length === 0 ? (
    <EuiText size="s" textAlign="center" data-test-subj="dashboardPanelSelectionNoPanelMessage">
      <FormattedMessage
        id="dashboard.solutionToolbar.addPanelFlyout.noResultsDescription"
        defaultMessage="No panel types found"
      />
    </EuiText>
  ) : (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="dashboardPanelSelectionList">
      {groups.map((group) => (
        <EuiFlexItem
          key={group.id}
          data-test-subj={group['data-test-subj']}
          data-group-sort-order={group.order}
        >
          <Group group={group} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
