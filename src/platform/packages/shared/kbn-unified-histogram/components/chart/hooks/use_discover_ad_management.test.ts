/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, renderHook } from '@testing-library/react';
import { DataViewSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { dataViewMock } from '../../../__mocks__/data_view';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../../../__mocks__/services';
import { useDiscoverAdManagement } from './use_discover_ad_management';

const getTriggerCompatibleActions = unifiedHistogramServicesMock.uiActions
  .getTriggerCompatibleActions as jest.Mock;
const executeTriggerActions = unifiedHistogramServicesMock.uiActions
  .executeTriggerActions as jest.Mock;

const timeBasedSource = new DataViewSource(dataViewWithTimefieldMock);
const noTimeFieldSource = new DataViewSource(dataViewMock);
const esqlSource = createMockEsqlSource([], [], '@timestamp', 'FROM logs-* | LIMIT 10');
const esqlSourceWithoutTimeField = createMockEsqlSource();

describe('useDiscoverAdManagement', () => {
  beforeEach(() => {
    getTriggerCompatibleActions.mockReset();
    executeTriggerActions.mockClear();
  });

  it('returns a callback which runs the trigger for the data view', async () => {
    getTriggerCompatibleActions.mockResolvedValue([{ id: 'test' }]);
    const { result } = renderHook(() =>
      useDiscoverAdManagement({
        services: unifiedHistogramServicesMock,
        dataSource: timeBasedSource,
      })
    );

    await waitFor(() => expect(result.current).toBeDefined());
    result.current!();

    expect(executeTriggerActions).toHaveBeenCalledWith('DISCOVER_AD_MANAGEMENT_TRIGGER', {
      indexPattern: dataViewWithTimefieldMock.getIndexPattern(),
      dataViewId: dataViewWithTimefieldMock.id,
    });
  });

  it('returns undefined when no action handles the trigger', async () => {
    getTriggerCompatibleActions.mockResolvedValue([]);
    const { result } = renderHook(() =>
      useDiscoverAdManagement({
        services: unifiedHistogramServicesMock,
        dataSource: timeBasedSource,
      })
    );

    await waitFor(() => expect(getTriggerCompatibleActions).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined for a data view without a time field', async () => {
    getTriggerCompatibleActions.mockResolvedValue([{ id: 'test' }]);
    const { result } = renderHook(() =>
      useDiscoverAdManagement({
        services: unifiedHistogramServicesMock,
        dataSource: noTimeFieldSource,
      })
    );

    expect(result.current).toBeUndefined();
    expect(getTriggerCompatibleActions).not.toHaveBeenCalled();
  });

  it('returns a callback which runs the trigger for the index of an ES|QL query', async () => {
    getTriggerCompatibleActions.mockResolvedValue([{ id: 'test' }]);
    const { result } = renderHook(() =>
      useDiscoverAdManagement({ services: unifiedHistogramServicesMock, dataSource: esqlSource })
    );

    await waitFor(() => expect(result.current).toBeDefined());
    result.current!();

    expect(executeTriggerActions).toHaveBeenCalledWith('DISCOVER_AD_MANAGEMENT_TRIGGER', {
      indexPattern: esqlSource.title,
      dataViewId: undefined,
    });
  });

  it('returns undefined for an ES|QL query without a time field', async () => {
    getTriggerCompatibleActions.mockResolvedValue([{ id: 'test' }]);
    const { result } = renderHook(() =>
      useDiscoverAdManagement({
        services: unifiedHistogramServicesMock,
        dataSource: esqlSourceWithoutTimeField,
      })
    );

    expect(result.current).toBeUndefined();
    expect(getTriggerCompatibleActions).not.toHaveBeenCalled();
  });
});
