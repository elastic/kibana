/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps, FC } from 'react';
import { render, screen } from '@testing-library/react';
import { CellValueHost } from './cell_value_host';
import { createPartialObjectMock } from '../utils/test';
import { ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS, ALERT_STATUS } from '@kbn/rule-data-utils';
import { DefaultCellValue } from './default_cell_value';

jest.mock('./system_cell', () => {
  const original = jest.requireActual('./system_cell');
  return {
    ...original,
    SystemCell: jest.fn(() => <div data-test-subj="systemCell" />),
  };
});
jest.mock('./default_cell_value');
jest.mocked(DefaultCellValue as FC).mockReturnValue(<div data-test-subj="defaultCell" />);

const props = createPartialObjectMock<ComponentProps<typeof CellValueHost>>({
  isLoading: false,
  alerts: [
    {
      _id: 'test',
      _index: 'alerts',
      [ALERT_STATUS]: ['active'],
    },
  ],
  oldAlertsData: [],
  ecsAlertsData: [],
  showAlertStatusWithFlapping: false,
  casesConfig: undefined,
  rowIndex: 0,
  pageIndex: 0,
  pageSize: 10,
});

describe('CellValueHost', () => {
  it.each([ALERT_STATUS, ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS])(
    'should render a SystemCell for cases, maintenance windows, and alert status',
    (columnId) => {
      render(<CellValueHost {...props} columnId={columnId} />);
      expect(screen.getByTestId('systemCell')).toBeInTheDocument();
    }
  );

  it('should render the provided renderCellValue for other fields', () => {
    render(
      <CellValueHost
        {...props}
        columnId="otherField"
        renderCellValue={jest.fn(() => (
          <div data-test-subj="customRenderCellValue" />
        ))}
      />
    );
    expect(screen.getByTestId('customRenderCellValue')).toBeInTheDocument();
  });

  it('should render a DefaultCell for other fields when a custom renderCellValue is not defined', () => {
    render(<CellValueHost {...props} columnId="otherField" />);
    expect(screen.getByTestId('defaultCell')).toBeInTheDocument();
  });

  it('should render a loading skeleton when the isLoading prop is true and the alert is not available yet', () => {
    render(<CellValueHost {...props} columnId="otherField" isLoading alerts={[]} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
