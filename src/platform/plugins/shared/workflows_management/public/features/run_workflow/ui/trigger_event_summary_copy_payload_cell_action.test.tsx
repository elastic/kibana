/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockCopyToClipboard = jest.fn((_value: string) => true);
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: (value: string) => mockCopyToClipboard(value),
  };
});

import { EuiButtonEmpty, EuiProvider } from '@elastic/eui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { ToastsStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';
import type { DataTableContext } from '@kbn/unified-data-table/src/table_context';
import { formatTriggerEventPayloadForCopy } from './trigger_event_payload_format';
import {
  createTriggerEventSummaryCopyPayloadCellAction,
  withoutTrailingDefaultCopyCellAction,
} from './trigger_event_summary_copy_payload_cell_action';

describe('withoutTrailingDefaultCopyCellAction', () => {
  it('returns empty array for undefined or empty input', () => {
    expect(withoutTrailingDefaultCopyCellAction(undefined)).toEqual([]);
    expect(withoutTrailingDefaultCopyCellAction([])).toEqual([]);
  });

  it('drops the last action when one or more actions exist', () => {
    expect(withoutTrailingDefaultCopyCellAction(['copy'])).toEqual([]);
    expect(withoutTrailingDefaultCopyCellAction(['filter', 'copy'])).toEqual(['filter']);
  });

  it('accepts readonly arrays', () => {
    const actions = ['a', 'b'] as const;
    expect(withoutTrailingDefaultCopyCellAction(actions)).toEqual(['a']);
  });
});

describe('createTriggerEventSummaryCopyPayloadCellAction', () => {
  const addInfo = jest.fn();
  const addWarning = jest.fn();
  const toastNotifications = { addInfo, addWarning } as unknown as ToastsStart;

  const MockCellButton = (props: React.ComponentProps<typeof EuiButtonEmpty>) => (
    <EuiButtonEmpty {...props} />
  );

  const renderWithTableContext = (getRowByIndex: DataTableContext['getRowByIndex']) => {
    const CellAction = createTriggerEventSummaryCopyPayloadCellAction(toastNotifications);
    return render(
      <EuiProvider>
        <I18nProvider>
          <UnifiedDataTableContext.Provider value={{ getRowByIndex } as DataTableContext}>
            <CellAction
              Component={MockCellButton}
              rowIndex={0}
              columnId="summary"
              colIndex={0}
              isExpanded={false}
            />
          </UnifiedDataTableContext.Provider>
        </I18nProvider>
      </EuiProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCopyToClipboard.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('copies formatted JSON from raw _source.payload', () => {
    renderWithTableContext(() => ({
      id: 'r1',
      raw: {
        _id: 'r1',
        _source: { payload: { foo: 'bar' } },
      },
      flattened: {},
    }));

    fireEvent.click(screen.getByTestId('workflowTriggerEventSummaryCopyPayloadButton'));

    expect(mockCopyToClipboard).toHaveBeenCalledWith(
      formatTriggerEventPayloadForCopy({ foo: 'bar' })
    );
    expect(addInfo).toHaveBeenCalled();
    expect(addWarning).not.toHaveBeenCalled();
  });

  it('copies empty string when payload is missing', () => {
    renderWithTableContext(() => ({
      id: 'r1',
      raw: {
        _id: 'r1',
        _source: { triggerId: 't1' },
      },
      flattened: {},
    }));

    fireEvent.click(screen.getByTestId('workflowTriggerEventSummaryCopyPayloadButton'));

    expect(mockCopyToClipboard).toHaveBeenCalledWith('');
  });

  it('shows a warning when clipboard copy fails', () => {
    mockCopyToClipboard.mockReturnValue(false);
    renderWithTableContext(() => ({
      id: 'r1',
      raw: {
        _id: 'r1',
        _source: { payload: { x: 1 } },
      },
      flattened: {},
    }));

    fireEvent.click(screen.getByTestId('workflowTriggerEventSummaryCopyPayloadButton'));

    expect(addWarning).toHaveBeenCalled();
    expect(addInfo).not.toHaveBeenCalled();
  });
});
