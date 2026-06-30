/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { apm } from '@elastic/apm-rum';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useAdhocDataView } from '.';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

jest.mock('../../../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
  },
}));

const mockCreate = jest.fn();
const mockAdd = jest.fn();
const mockAddDanger = jest.fn();

(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
  data: {
    dataViews: {
      create: mockCreate,
    },
  },
  core: {
    notifications: {
      toasts: {
        add: mockAdd,
        addDanger: mockAddDanger,
      },
    },
  },
});

describe('useAdhocDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a data view and sets it on success', async () => {
    const dataView = { id: 'test-data-view' } as DataView;
    mockCreate.mockResolvedValue(dataView);

    const { result } = renderHook(() => useAdhocDataView({ index: 'logs-*' }));

    await waitFor(() => !result.current.loading);

    expect(result.current.dataView).toBe(dataView);
    expect(result.current.error).toBeNull();
  });

  it('captures a single APM event with the operation id label and shows a non-capturing danger toast on error', async () => {
    const error = new Error('create failed');
    mockCreate.mockRejectedValue(error);

    const { result } = renderHook(() => useAdhocDataView({ index: 'logs-*' }));

    await waitFor(() => !result.current.loading);

    expect(result.current.error).toBe('An error occurred while creating the data view');

    expect(apm.captureError).toHaveBeenCalledWith(error, {
      labels: { kibana_meta_operation_id: 'create-adhoc-data-view' },
    });

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'danger',
        iconType: 'error',
        title: 'An error occurred while creating the data view',
        text: 'create failed',
      })
    );
    expect(mockAddDanger).not.toHaveBeenCalled();
  });
});
