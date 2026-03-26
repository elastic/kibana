/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useState } from 'react';
import type { EuiDataGridControlColumn } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip, findElementBySelectorOrRef } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AddColumnPopover } from './add_column_popover';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';

const ADD_COLUMN_ACTION_ID = 'add-column';

const addColumnText = i18n.translate('indexEditor.dataGrid.addColumn', {
  defaultMessage: 'Add field',
});

export const getAddColumnControl = (
  telemetryService: IndexEditorTelemetryService
): EuiDataGridControlColumn => ({
  id: ADD_COLUMN_ACTION_ID,
  width: 40,
  headerCellRender: () => <AddColumnControl telemetryService={telemetryService} />,
  headerCellProps: {
    className: 'dataGrid__addColumnHeader',
  },
  rowCellRender: () => <div />,
});

interface AddColumnControlProps {
  telemetryService: IndexEditorTelemetryService;
}

const AddColumnControl: React.FC<AddColumnControlProps> = ({ telemetryService }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <AddColumnPopover
      isPopoverOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      telemetryService={telemetryService}
      triggerButton={
        <EuiToolTip content={addColumnText} disableScreenReaderOutput>
          <EuiButtonIcon
            color="text"
            display="base"
            iconType="plus"
            size="xs"
            aria-label={addColumnText}
            data-test-subj="indexEditorAddColumnButton"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            onKeyDown={(e: React.KeyboardEvent) => {
              // Focus back to the control cell when pressing Escape
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                requestAnimationFrame(() => {
                  const headerWrapper = findElementBySelectorOrRef(
                    `[data-test-subj="dataGridHeaderCell-${ADD_COLUMN_ACTION_ID}"]`
                  );
                  if (headerWrapper) {
                    headerWrapper.focus();
                  }
                });
              }
            }}
          />
        </EuiToolTip>
      }
    />
  );
};
