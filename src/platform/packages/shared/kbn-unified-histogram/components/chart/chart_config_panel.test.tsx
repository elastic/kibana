/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { setTimeout } from 'timers/promises';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import { currentSuggestionMock } from '../../__mocks__/suggestions';
import { lensAdaptersMock } from '../../__mocks__/lens_adapters';
import { ChartConfigPanel } from './chart_config_panel';
import type { UnifiedHistogramVisContext } from '../../types';
import { UnifiedHistogramSuggestionType } from '../../types';

describe('ChartConfigPanel', () => {
  it('should return a jsx element to edit the visualization', async () => {
    const lensAttributes = {
      visualizationType: 'lnsXY',
      title: 'test',
    } as TypedLensByValueInput['attributes'];
    const { container } = render(
      <ChartConfigPanel
        {...{
          services: unifiedHistogramServicesMock,
          dataView: dataViewWithTimefieldMock,
          visContext: {
            attributes: lensAttributes,
          } as unknown as UnifiedHistogramVisContext,
          isFlyoutVisible: true,
          setIsFlyoutVisible: jest.fn(),
          onSuggestionContextChange: jest.fn(),
          onSuggestionContextEdit: jest.fn(),
          isPlainRecord: true,
          lensAdapters: lensAdaptersMock,
          query: {
            esql: 'from test',
          },
          currentSuggestionContext: {
            suggestion: currentSuggestionMock,
            type: UnifiedHistogramSuggestionType.lensSuggestion,
          },
        }}
      />
    );
    await act(() => setTimeout(0));
    expect(container).not.toBeEmptyDOMElement();
  });

  it('should return a jsx element to edit the visualization without Lens table adapters', async () => {
    const lensAttributes = {
      visualizationType: 'lnsXY',
      title: 'test',
    } as TypedLensByValueInput['attributes'];
    const { container } = render(
      <ChartConfigPanel
        {...{
          services: unifiedHistogramServicesMock,
          dataView: dataViewWithTimefieldMock,
          visContext: {
            attributes: lensAttributes,
          } as unknown as UnifiedHistogramVisContext,
          isFlyoutVisible: true,
          setIsFlyoutVisible: jest.fn(),
          onSuggestionContextChange: jest.fn(),
          onSuggestionContextEdit: jest.fn(),
          isPlainRecord: true,
          query: {
            esql: 'from test',
          },
          currentSuggestionContext: {
            suggestion: currentSuggestionMock,
            type: UnifiedHistogramSuggestionType.lensSuggestion,
          },
        }}
      />
    );
    await act(() => setTimeout(0));
    expect(container).not.toBeEmptyDOMElement();
  });

  it('should not recreate the editor when visContext.attributes identity changes', async () => {
    const editLensConfigPanelApi = jest
      .fn()
      .mockResolvedValue(() => <span>Lens Config Panel Component</span>);
    const services = {
      ...unifiedHistogramServicesMock,
      lens: {
        ...unifiedHistogramServicesMock.lens,
        EditLensConfigPanelApi: editLensConfigPanelApi,
      },
    };
    const lensAttributes = {
      visualizationType: 'lnsXY',
      title: 'test',
    } as TypedLensByValueInput['attributes'];
    const currentSuggestionContext = {
      suggestion: currentSuggestionMock,
      type: UnifiedHistogramSuggestionType.lensSuggestion,
    };
    const props = {
      services,
      visContext: {
        attributes: lensAttributes,
      } as unknown as UnifiedHistogramVisContext,
      isFlyoutVisible: true,
      setIsFlyoutVisible: jest.fn(),
      onSuggestionContextChange: jest.fn(),
      onSuggestionContextEdit: jest.fn(),
      isPlainRecord: true as const,
      lensAdapters: lensAdaptersMock,
      query: {
        esql: 'from test',
      },
      currentSuggestionContext,
    };

    const { rerender } = render(<ChartConfigPanel {...props} />);
    await act(() => setTimeout(0));
    const callsAfterFirstLoad = editLensConfigPanelApi.mock.calls.length;
    expect(callsAfterFirstLoad).toBeGreaterThan(0);

    rerender(
      <ChartConfigPanel
        {...props}
        visContext={
          {
            attributes: { ...lensAttributes, title: 'updated' },
          } as unknown as UnifiedHistogramVisContext
        }
      />
    );
    await act(() => setTimeout(0));
    expect(editLensConfigPanelApi.mock.calls.length).toBe(callsAfterFirstLoad);

    rerender(
      <ChartConfigPanel
        {...props}
        visContext={
          {
            attributes: { ...lensAttributes, title: 'updated' },
          } as unknown as UnifiedHistogramVisContext
        }
        query={{ esql: 'from test | stats count()' }}
        lensAdapters={
          {
            tables: {
              tables: {
                default: {
                  columns: [
                    {
                      id: 'col-0-1',
                      meta: { type: 'number' },
                      name: 'Field 1',
                    },
                    {
                      id: 'col-0-2',
                      meta: { type: 'number' },
                      name: 'Field 2',
                    },
                  ],
                  rows: [{ 'col-0-1': 1, 'col-0-2': 1 }],
                  type: 'datatable',
                },
              },
            },
          } as unknown as typeof lensAdaptersMock
        }
      />
    );
    await act(() => setTimeout(0));
    expect(editLensConfigPanelApi.mock.calls.length).toBeGreaterThan(callsAfterFirstLoad);
  });

  it('should return null if not in text based mode', async () => {
    const lensAttributes = {
      visualizationType: 'lnsXY',
      title: 'test',
    } as TypedLensByValueInput['attributes'];
    const { container } = render(
      <ChartConfigPanel
        {...{
          services: unifiedHistogramServicesMock,
          dataView: dataViewWithTimefieldMock,
          visContext: {
            attributes: lensAttributes,
          } as unknown as UnifiedHistogramVisContext,
          isFlyoutVisible: true,
          setIsFlyoutVisible: jest.fn(),
          onSuggestionContextChange: jest.fn(),
          onSuggestionContextEdit: jest.fn(),
          isPlainRecord: false,
          currentSuggestionContext: {
            suggestion: currentSuggestionMock,
            type: UnifiedHistogramSuggestionType.histogramForDataView,
          },
        }}
      />
    );
    await act(() => setTimeout(0));
    expect(container).toBeEmptyDOMElement();
  });
});
