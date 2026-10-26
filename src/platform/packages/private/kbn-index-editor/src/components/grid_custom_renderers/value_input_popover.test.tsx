/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import type { EuiDataGridRefProps } from '@elastic/eui';
import { analyticsServiceMock } from '@kbn/core/public/mocks';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';
import { getValueInputPopover } from './value_input_popover';

describe('getValueInputPopover', () => {
  it('saves an edited cell value when the popover closes', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    const rows: DataTableRecord[] = [
      {
        id: 'document-1',
        raw: {},
        flattened: { name: 'Elyssa' },
      },
    ];
    const columns: DatatableColumn[] = [
      {
        id: 'name',
        name: 'name',
        meta: { type: 'string' },
      },
    ];
    const dataTableRef: React.RefObject<EuiDataGridRefProps> = {
      current: {
        setIsFullScreen: jest.fn(),
        openCellPopover: jest.fn(),
        closeCellPopover: jest.fn(),
        setFocusedCell: jest.fn(),
      },
    };
    const telemetryService = new IndexEditorTelemetryService(
      analyticsServiceMock.createAnalyticsServiceStart(),
      true,
      true,
      'test'
    );
    const ValueInputPopover = getValueInputPopover({
      rows,
      columns,
      onValueChange,
      dataTableRef,
      telemetryService,
    });

    const { unmount } = renderWithI18n(
      <ValueInputPopover
        rowIndex={0}
        colIndex={0}
        columnId="name"
        cellContentsElement={document.createElement('div')}
        cellActions={[]}
        DefaultCellPopover={() => null}
        setCellPopoverProps={jest.fn()}
      >
        Elyssa
      </ValueInputPopover>
    );
    const input = screen.getByRole('textbox', { name: 'Value for name' });
    expect(input).toHaveValue('Elyssa');
    await user.clear(input);
    await user.type(input, 'Jasmin');

    unmount();

    expect(onValueChange).toHaveBeenCalledWith('document-1', { name: 'Jasmin' });
  });
});
