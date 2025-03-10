/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCheckbox } from '@elastic/eui';
import React, { ChangeEvent, useCallback } from 'react';
import { BulkActionsVerbs } from '../types';
import { COLUMN_HEADER_ARIA_LABEL } from '../translations';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

const BulkActionsHeaderComponent: React.FunctionComponent = () => {
  const {
    bulkActionsStore: [{ isAllSelected, areAllVisibleRowsSelected }, updateSelectedRows],
  } = useAlertsTableContext();

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        updateSelectedRows({ action: BulkActionsVerbs.selectCurrentPage });
      } else {
        updateSelectedRows({ action: BulkActionsVerbs.clear });
      }
    },
    [updateSelectedRows]
  );

  return (
    <EuiCheckbox
      id="selection-toggle"
      aria-label={COLUMN_HEADER_ARIA_LABEL}
      checked={isAllSelected || areAllVisibleRowsSelected}
      onChange={onChange}
      data-test-subj="bulk-actions-header"
    />
  );
};

export const BulkActionsHeader = React.memo(BulkActionsHeaderComponent);
