/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';
import { setTimeout } from 'timers/promises';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import { lensTablesAdapterMock } from '../../__mocks__/lens_table_adapter';
import { useChartConfigPanel } from './use_chart_config_panel';
import type { LensAttributesContext } from '../utils/get_lens_attributes';

describe('useChartConfigPanel', () => {
  it('should return a jsx element to edit the visualization', async () => {
    const lensAttributes = {
      visualizationType: 'lnsXY',
      title: 'test',
    } as TypedLensByValueInput['attributes'];
    const hook = renderHook(() =>
      useChartConfigPanel({
        services: unifiedHistogramServicesMock,
        dataView: dataViewWithTimefieldMock,
        lensAttributesContext: {
          attributes: lensAttributes,
        } as unknown as LensAttributesContext,
        isFlyoutVisible: true,
        setIsFlyoutVisible: jest.fn(),
        isPlainRecord: true,
        lensTablesAdapter: lensTablesAdapterMock,
        query: {
          sql: 'Select * from test',
        },
      })
    );
    await act(() => setTimeout(0));
    expect(hook.result.current).toBeDefined();
    expect(hook.result.current).not.toBeNull();
  });

  it('should return null if not in text based mode', async () => {
    const lensAttributes = {
      visualizationType: 'lnsXY',
      title: 'test',
    } as TypedLensByValueInput['attributes'];
    const hook = renderHook(() =>
      useChartConfigPanel({
        services: unifiedHistogramServicesMock,
        dataView: dataViewWithTimefieldMock,
        lensAttributesContext: {
          attributes: lensAttributes,
        } as unknown as LensAttributesContext,
        isFlyoutVisible: true,
        setIsFlyoutVisible: jest.fn(),
        isPlainRecord: false,
      })
    );
    await act(() => setTimeout(0));
    expect(hook.result.current).toBeNull();
  });
});
