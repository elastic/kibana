/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { UISession } from '../../../types';
import { OnActionComplete, PopoverActionsMenu } from '../actions';
import { SearchSessionsMgmtAPI } from '../../../lib/api';

export const actionsColumn = ({
  api,
  core,
  onActionComplete,
  allowedActions,
}: {
  core: CoreStart;
  api: SearchSessionsMgmtAPI;
  onActionComplete: OnActionComplete;
  allowedActions?: UISession['actions'];
}): EuiBasicTableColumn<UISession> => ({
  field: 'actions',
  name: '',
  sortable: false,
  render: (actions: UISession['actions'], session) => {
    if (actions && actions.length) {
      return (
        <EuiFlexGroup gutterSize="l" justifyContent="flexEnd" alignItems="flexEnd">
          <EuiFlexItem grow={false} data-test-subj="sessionManagementActionsCol">
            <PopoverActionsMenu
              api={api}
              key={`popkey-${session.id}`}
              session={session}
              core={core}
              allowedActions={allowedActions}
              onActionComplete={onActionComplete}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  },
});
