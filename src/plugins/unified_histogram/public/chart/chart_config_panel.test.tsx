/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { setTimeout } from 'timers/promises';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { currentSuggestionMock } from '../__mocks__/suggestions';
import { lensAdaptersMock } from '../__mocks__/lens_adapters';
import { ChartConfigPanel } from './chart_config_panel';
import type { UnifiedHistogramLensAttributesContext } from '../types';
import { UnifiedHistogramSuggestionType } from '../types';

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
          lensAttributesContext: {
            attributes: lensAttributes,
          } as unknown as UnifiedHistogramLensAttributesContext,
          isFlyoutVisible: true,
          setIsFlyoutVisible: jest.fn(),
          isPlainRecord: true,
          lensAdapters: lensAdaptersMock,
          query: {
            esql: 'from test',
          },
          currentSuggestionContext: {
            suggestion: currentSuggestionMock,
            type: UnifiedHistogramSuggestionType.supportedLensSuggestion,
            suggestionDeps: [undefined, undefined, undefined, undefined],
          },
        }}
      />
    );
    await act(() => setTimeout(0));
    expect(container).not.toBeEmptyDOMElement();
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
          lensAttributesContext: {
            attributes: lensAttributes,
          } as unknown as UnifiedHistogramLensAttributesContext,
          isFlyoutVisible: true,
          setIsFlyoutVisible: jest.fn(),
          isPlainRecord: false,
          currentSuggestionContext: {
            suggestion: currentSuggestionMock,
            type: UnifiedHistogramSuggestionType.localHistogramDefault,
            suggestionDeps: [undefined, undefined, undefined, undefined],
          },
        }}
      />
    );
    await act(() => setTimeout(0));
    expect(container).toBeEmptyDOMElement();
  });
});
