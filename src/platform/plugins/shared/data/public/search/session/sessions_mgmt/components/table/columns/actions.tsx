/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { UISession } from '../../../types';
import type { OnActionComplete } from '../actions';
import { PopoverActionsMenu } from '../actions';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';

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
  name: i18n.translate('data.mgmt.searchSessions.table.headerActions', {
    defaultMessage: 'Actions',
  }),
  sortable: false,
  align: 'right',
  render: (actions: UISession['actions'], session) => {
    if (!actions?.length) return null;

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
  },
});
