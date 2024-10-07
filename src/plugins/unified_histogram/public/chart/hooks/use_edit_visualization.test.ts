/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';
import { setTimeout } from 'timers/promises';
import { dataViewMock } from '../../__mocks__/data_view';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import { useEditVisualization } from './use_edit_visualization';

const getTriggerCompatibleActions = unifiedHistogramServicesMock.uiActions
  .getTriggerCompatibleActions as jest.Mock;

const navigateToPrefilledEditor = unifiedHistogramServicesMock.lens
  .navigateToPrefilledEditor as jest.Mock;

describe('useEditVisualization', () => {
  beforeEach(() => {
    getTriggerCompatibleActions.mockClear();
    navigateToPrefilledEditor.mockClear();
  });

  it('should return a function to edit the visualization', async () => {
    getTriggerCompatibleActions.mockReturnValue(Promise.resolve([{ id: 'test' }]));
    const relativeTimeRange = { from: 'now-15m', to: 'now' };
    const lensAttributes = {
      visualizationType: 'lnsXY',
      title: 'test',
    } as TypedLensByValueInput['attributes'];
    const hook = renderHook(() =>
      useEditVisualization({
        services: unifiedHistogramServicesMock,
        dataView: dataViewWithTimefieldMock,
        relativeTimeRange,
        lensAttributes,
      })
    );
    await act(() => setTimeout(0));
    expect(hook.result.current).toBeDefined();
    hook.result.current!();
    expect(navigateToPrefilledEditor).toHaveBeenCalledWith({
      id: '',
      timeRange: relativeTimeRange,
      attributes: lensAttributes,
    });
  });

  it('should return undefined if the data view has no ID', async () => {
    getTriggerCompatibleActions.mockReturnValue(Promise.resolve([{ id: 'test' }]));
    const hook = renderHook(() =>
      useEditVisualization({
        services: unifiedHistogramServicesMock,
        dataView: { ...dataViewWithTimefieldMock, id: undefined } as DataView,
        relativeTimeRange: { from: 'now-15m', to: 'now' },
        lensAttributes: {} as unknown as TypedLensByValueInput['attributes'],
      })
    );
    await act(() => setTimeout(0));
    expect(hook.result.current).toBeUndefined();
  });

  it('should return undefined if the data view is not time based', async () => {
    getTriggerCompatibleActions.mockReturnValue(Promise.resolve([{ id: 'test' }]));
    const hook = renderHook(() =>
      useEditVisualization({
        services: unifiedHistogramServicesMock,
        dataView: dataViewMock,
        relativeTimeRange: { from: 'now-15m', to: 'now' },
        lensAttributes: {} as unknown as TypedLensByValueInput['attributes'],
      })
    );
    await act(() => setTimeout(0));
    expect(hook.result.current).toBeUndefined();
  });

  it('should return undefined if is on text based mode', async () => {
    getTriggerCompatibleActions.mockReturnValue(Promise.resolve([{ id: 'test' }]));
    const hook = renderHook(() =>
      useEditVisualization({
        services: unifiedHistogramServicesMock,
        dataView: dataViewWithTimefieldMock,
        relativeTimeRange: { from: 'now-15m', to: 'now' },
        lensAttributes: {} as unknown as TypedLensByValueInput['attributes'],
        isPlainRecord: true,
      })
    );
    await act(() => setTimeout(0));
    expect(hook.result.current).toBeUndefined();
  });

  it('should return undefined if the time field is not visualizable', async () => {
    getTriggerCompatibleActions.mockReturnValue(Promise.resolve([{ id: 'test' }]));
    const dataView = {
      ...dataViewWithTimefieldMock,
      getTimeField: () => {
        return { ...dataViewWithTimefieldMock.getTimeField(), visualizable: false };
      },
    } as DataView;
    const hook = renderHook(() =>
      useEditVisualization({
        services: unifiedHistogramServicesMock,
        dataView,
        relativeTimeRange: { from: 'now-15m', to: 'now' },
        lensAttributes: {} as unknown as TypedLensByValueInput['attributes'],
      })
    );
    await act(() => setTimeout(0));
    expect(hook.result.current).toBeUndefined();
  });

  it('should return undefined if there are no compatible actions', async () => {
    getTriggerCompatibleActions.mockReturnValue(Promise.resolve([]));
    const hook = renderHook(() =>
      useEditVisualization({
        services: unifiedHistogramServicesMock,
        dataView: dataViewWithTimefieldMock,
        relativeTimeRange: { from: 'now-15m', to: 'now' },
        lensAttributes: {} as unknown as TypedLensByValueInput['attributes'],
      })
    );
    await act(() => setTimeout(0));
    expect(hook.result.current).toBeUndefined();
  });
});
