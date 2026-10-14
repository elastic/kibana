/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridRefProps } from '@elastic/eui';
import {
  analyticsServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { RowControlComponent, RowControlRowProps } from '@kbn/discover-utils';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RefObject } from 'react';
import { IndexUpdateService } from '../../services/index_update_service';
import { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';
import { getAddRowControl } from './add_row_control';

describe('getAddRowControl', () => {
  it('adds an empty row after the selected row', async () => {
    const user = userEvent.setup();
    const telemetryService = new IndexEditorTelemetryService(
      analyticsServiceMock.createAnalyticsServiceStart(),
      true,
      true,
      'test'
    );
    const indexUpdateService = new IndexUpdateService(
      httpServiceMock.createStartContract(),
      dataPluginMock.createStartContract(),
      notificationServiceMock.createStartContract(),
      telemetryService,
      true
    );
    const addEmptyRow = jest.spyOn(indexUpdateService, 'addEmptyRow');
    const dataTableRef: RefObject<EuiDataGridRefProps> = {
      current: {
        setIsFullScreen: jest.fn(),
        openCellPopover: jest.fn(),
        closeCellPopover: jest.fn(),
        setFocusedCell: jest.fn(),
      },
    };
    const Control: RowControlComponent = () => null;
    const rowProps: RowControlRowProps = {
      rowIndex: 1,
      record: {
        id: 'document-1',
        raw: {},
        flattened: {},
      },
    };
    const addRowControl = getAddRowControl(indexUpdateService, dataTableRef);

    renderWithI18n(addRowControl.render(Control, rowProps));

    await user.click(screen.getByRole('button', { name: 'Add Row' }));

    expect(addEmptyRow).toHaveBeenCalledWith(2);
    indexUpdateService.destroy();
  });
});
