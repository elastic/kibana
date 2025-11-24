/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { EuiDataGridControlColumn } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IndexUpdateService } from '../../index_update_service';

const addColumnText = i18n.translate('indexEditor.dataGrid.addColumn', {
  defaultMessage: 'Add Column',
});

export const getAddColumnControl = (
  indexUpdateService: IndexUpdateService
): EuiDataGridControlColumn => ({
  id: 'add-column',
  width: 40,
  headerCellRender: () => (
    <EuiToolTip content={addColumnText} disableScreenReaderOutput>
      <EuiButtonIcon
        color="text"
        display="base"
        iconType="plus"
        size="xs"
        aria-label={addColumnText}
        onClick={() => indexUpdateService.addNewColumn()}
      />
    </EuiToolTip>
  ),
  headerCellProps: {
    className: 'dataGrid__addColumnHeader',
  },
  rowCellRender: () => <div />,
});
