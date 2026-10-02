/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { UnifiedHistogramOverlaySeriesResult } from '@kbn/unified-histogram';
import { useEsqlDataCascadeHeaderComponent } from '../cascaded_documents/blocks/use_table_header_components';
import type { DiscoverHistogramOverlaySelection } from '../../../state_management/redux/runtime_state';
import {
  getPatternComparisonMessageState,
  PatternComparisonMessage,
  type PatternComparisonMessageState,
} from './pattern_comparison_message';

const selection = { key: 'pattern-key' } as DiscoverHistogramOverlaySelection;

const result = (applied: boolean, approximate: boolean): UnifiedHistogramOverlaySeriesResult => ({
  key: selection.key,
  applied,
  approximate,
});

describe('PatternComparisonMessage', () => {
  const renderMessage = (patternComparison: PatternComparisonMessageState) =>
    render(
      <EuiThemeProvider>
        <I18nProvider>
          <PatternComparisonMessage patternComparison={patternComparison} />
        </I18nProvider>
      </EuiThemeProvider>
    );

  const renderCascadeHeader = (patternComparison: PatternComparisonMessageState) => {
    const { result: header } = renderHook(() =>
      useEsqlDataCascadeHeaderComponent({
        renderViewModeToggle: () => <span />,
        cascadeGroupingChangeHandler: jest.fn(),
        patternComparison,
      })
    );

    return render(
      <EuiThemeProvider>
        <I18nProvider>
          {header.current({
            availableColumns: [],
            currentSelectedColumns: [],
            onGroupSelection: jest.fn(),
            selectedRows: [],
          })}
        </I18nProvider>
      </EuiThemeProvider>
    );
  };

  it('asks to select a pattern when nothing is selected', () => {
    renderMessage('hint');
    renderCascadeHeader('hint');

    expect(screen.getAllByTestId('patternHistogramComparisonHint')).toHaveLength(2);
    expect(screen.getAllByTestId('patternHistogramComparisonHint')[0]).toHaveTextContent(
      'Select a pattern to compare its volume with total document volume.'
    );
    expect(screen.queryByTestId('patternHistogramApproximate')).not.toBeInTheDocument();
  });

  it('replaces the hint when the comparison is approximate', () => {
    renderMessage('approximate');
    renderCascadeHeader('approximate');

    expect(screen.getAllByTestId('patternHistogramApproximate')).toHaveLength(2);
    expect(screen.getAllByTestId('patternHistogramApproximate')[0]).toHaveTextContent(
      'Pattern comparison is approximate.'
    );
    expect(screen.queryByTestId('patternHistogramComparisonHint')).not.toBeInTheDocument();
  });

  it('reports that the comparison is unavailable when the chart did not apply it', () => {
    renderMessage('unavailable');
    renderCascadeHeader('unavailable');

    expect(screen.getAllByTestId('patternHistogramComparisonUnavailable')).toHaveLength(2);
    expect(screen.getAllByTestId('patternHistogramComparisonUnavailable')[0]).toHaveTextContent(
      'Pattern comparison is unavailable.'
    );
  });

  it('keeps group by beside the hint and omits the hint when comparison is unset', () => {
    renderCascadeHeader('hint');

    expect(screen.getByTestId('patternHistogramComparisonHint')).toBeInTheDocument();
    expect(screen.getByTestId('discoverEnableCascadeLayoutSwitch')).toBeInTheDocument();

    const { result: header } = renderHook(() =>
      useEsqlDataCascadeHeaderComponent({
        renderViewModeToggle: () => <span />,
        cascadeGroupingChangeHandler: jest.fn(),
      })
    );

    render(
      <EuiThemeProvider>
        <I18nProvider>
          {header.current({
            availableColumns: [],
            currentSelectedColumns: [],
            onGroupSelection: jest.fn(),
            selectedRows: [],
          })}
        </I18nProvider>
      </EuiThemeProvider>
    );

    expect(screen.getAllByTestId('discoverEnableCascadeLayoutSwitch')).toHaveLength(2);
    expect(screen.getAllByTestId('patternHistogramComparisonHint')).toHaveLength(1);
  });
});

describe('getPatternComparisonMessageState', () => {
  it('shows the hint only while comparison is available and nothing is selected', () => {
    expect(
      getPatternComparisonMessageState({
        canCompare: true,
        chartHidden: false,
        selection: undefined,
        result: undefined,
      })
    ).toBe('hint');
  });

  it('hides every message when the chart is hidden or comparison is unavailable', () => {
    expect(
      getPatternComparisonMessageState({
        canCompare: true,
        chartHidden: true,
        selection: undefined,
        result: undefined,
      })
    ).toBeUndefined();
    expect(
      getPatternComparisonMessageState({
        canCompare: false,
        chartHidden: false,
        selection,
        result: result(false, false),
      })
    ).toBeUndefined();
  });

  it('shows the approximate and unavailable states only for the active result', () => {
    expect(
      getPatternComparisonMessageState({
        canCompare: true,
        chartHidden: false,
        selection,
        result: result(true, true),
      })
    ).toBe('approximate');
    expect(
      getPatternComparisonMessageState({
        canCompare: true,
        chartHidden: false,
        selection,
        result: result(false, false),
      })
    ).toBe('unavailable');
    expect(
      getPatternComparisonMessageState({
        canCompare: true,
        chartHidden: false,
        selection,
        result: { ...result(true, true), key: 'other' },
      })
    ).toBeUndefined();
    expect(
      getPatternComparisonMessageState({
        canCompare: true,
        chartHidden: false,
        selection,
        result: result(true, false),
      })
    ).toBeUndefined();
  });
});
