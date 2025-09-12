/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import { ChartSectionTemplate, useFetch } from '@kbn/unified-histogram';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import {
  EuiDelayRender,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiProgress,
  EuiText,
  euiScrollBarStyles,
  useEuiTheme,
  type EuiFlexGridProps,
} from '@elastic/eui';
import { IconChartBarStacked } from '@kbn/chart-icons';
import { Subject } from 'rxjs';
import useDebounce from 'react-use/lib/useDebounce';
import { FIELD_VALUE_SEPARATOR } from '../common/utils';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from './pagination';
import { DimensionsSelector } from './toolbar/dimensions_selector';
import { ValuesSelector } from './toolbar/values_selector';
import { usePaginatedFields, useMetricFieldsQuery, useMetricsGridState } from '../hooks';
import { FullScreenWrapper } from './fullscreen_wrapper/fullscreen_wrapper';
import { MetricsGridSearchControl } from './search_control/search_control';

export const MetricsExperienceGrid = ({
  dataView,
  renderToggleActions,
  chartToolbarCss,
  histogramCss,
  onBrushEnd,
  onFilter,
  searchSessionId,
  requestParams,
  services,
  input$: originalInput$,
}: ChartSectionProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const {
    currentPage,
    dimensions,
    valueFilters,
    onDimensionsChange,
    onValuesChange,
    onPageChange,
    onClearValues,
    onClearAllDimensions,
    onClearSearchTerm,
    isFullscreen,
    onToggleFullscreen,
    searchTerm,
    onSearchTermChange,
  } = useMetricsGridState();

  const [showSearchInput, setShowSearchInput] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
    },
    300,
    [searchTerm]
  );

  const onShowSearch = useCallback(() => {
    setShowSearchInput(true);
  }, []);

  const onClearSearch = useCallback(() => {
    setShowSearchInput(false);
    onClearSearchTerm();
    setDebouncedSearchTerm('');
  }, [onClearSearchTerm]);

  const { getTimeRange, updateTimeRange } = requestParams;

  const input$ = useMemo(
    () => originalInput$ ?? new Subject<UnifiedHistogramInputMessage>(),
    [originalInput$]
  );

  const discoverFetch$ = useFetch({
    input$,
    beforeFetch: updateTimeRange,
  });

  const indexPattern = useMemo(() => dataView?.getIndexPattern() ?? 'metrics-*', [dataView]);
  const { data: fields = [], isLoading } = useMetricFieldsQuery({
    index: indexPattern,
    timeRange: getTimeRange(),
  });

  const {
    currentPageFields = [],
    totalPages = 0,
    dimensions: appliedDimensions = [],
  } = usePaginatedFields({
    fields,
    dimensions,
    pageSize: 20,
    currentPage,
    searchTerm: debouncedSearchTerm,
  }) ?? {};

  const columns = useMemo<EuiFlexGridProps['columns']>(
    () => Math.min(currentPageFields.length, 4) as EuiFlexGridProps['columns'],
    [currentPageFields]
  );

  const filters = useMemo(() => {
    if (!valueFilters || valueFilters.length === 0) {
      return [];
    }

    return valueFilters
      .map((selectedValue) => {
        const [field, value] = selectedValue.split(`${FIELD_VALUE_SEPARATOR}`);
        return {
          field,
          value,
        };
      })
      .filter((filter) => filter.field !== '');
  }, [valueFilters]);

  const actions: IconButtonGroupProps['buttons'] = [
    ...(!showSearchInput
      ? [
          {
            iconType: 'search',
            label: i18n.translate('metricsExperience.searchButton', {
              defaultMessage: 'Search',
            }),
            onClick: onShowSearch,
            'data-test-subj': 'metricsExperienceToolbarSearch',
          },
        ]
      : []),
    {
      iconType: isFullscreen ? 'fullScreenExit' : 'fullScreen',
      label: isFullscreen
        ? i18n.translate('metricsExperience.fullScreenExitButton', {
            defaultMessage: 'Exit fullscreen',
          })
        : i18n.translate('metricsExperience.fullScreenButton', {
            defaultMessage: 'Enter fullscreen',
          }),
      onClick: onToggleFullscreen,
      'data-test-subj': 'metricsExperienceToolbarFullScreen',
      className: showSearchInput ? 'nextToSearchInput' : undefined,
    },
  ];

  const rightSideComponents = useMemo(
    () => [
      renderToggleActions(),
      <DimensionsSelector
        fields={fields}
        onChange={onDimensionsChange}
        selectedDimensions={dimensions}
        onClear={onClearAllDimensions}
      />,
      dimensions.length > 0 ? (
        <ValuesSelector
          selectedDimensions={dimensions}
          selectedValues={valueFilters}
          onChange={onValuesChange}
          disabled={dimensions.length === 0}
          indices={[indexPattern]}
          timeRange={getTimeRange()}
          onClear={onClearValues}
        />
      ) : null,
    ],
    [
      dimensions,
      fields,
      getTimeRange,
      indexPattern,
      onClearAllDimensions,
      onClearValues,
      onDimensionsChange,
      onValuesChange,
      renderToggleActions,
      valueFilters,
    ]
  );

  if (currentPageFields?.length === 0) {
    return (
      <ChartSectionTemplate
        id="metricsExperienceGridPanel"
        toolbarCss={chartToolbarCss}
        toolbar={{
          leftSide: rightSideComponents,
          rightSide: actions,
          additionalControls: {
            prependRight: showSearchInput ? (
              <MetricsGridSearchControl
                searchTerm={searchTerm}
                onSearchTermChange={onSearchTermChange}
                onClear={onClearSearch}
                data-test-subj="metricsExperienceToolbarSearchInput"
              />
            ) : undefined,
          },
        }}
      >
        <div
          css={css`
            height: 100%;
          `}
        >
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="spaceAround"
            css={css`
              height: 100%;
            `}
            gutterSize="s"
          >
            {isLoading ? (
              <EuiFlexItem>
                <EuiDelayRender delay={500} data-test-subj="metricsExperienceProgressBar">
                  <EuiProgress size="xs" color="accent" position="absolute" />
                </EuiDelayRender>
              </EuiFlexItem>
            ) : (
              <>
                <EuiFlexItem
                  css={css`
                    justify-content: end;
                  `}
                >
                  <EuiIcon type={IconChartBarStacked as IconType} size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" data-test-subj="metricsExperienceNoData">
                    {i18n.translate('metricsExperience.grid.noData', {
                      defaultMessage: 'No results found',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </div>
      </ChartSectionTemplate>
    );
  }

  return (
    <FullScreenWrapper isFullscreen={isFullscreen} dataTestSubj="metricsExperienceGrid">
      <ChartSectionTemplate
        id="metricsExperienceGridPanel"
        toolbarCss={chartToolbarCss}
        toolbar={{
          leftSide: rightSideComponents,
          rightSide: actions,
          additionalControls: {
            prependRight: showSearchInput ? (
              <MetricsGridSearchControl
                searchTerm={searchTerm}
                onSearchTermChange={onSearchTermChange}
                onClear={onClearSearch}
                data-test-subj="metricsExperienceToolbarSearchInput"
              />
            ) : undefined,
          },
        }}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          tabIndex={-1}
          data-test-subj="unifiedMetricsExperienceRendered"
          css={css`
            ${histogramCss || ''}
            height: 100%;
            overflow: auto;
            padding: ${euiTheme.size.s} ${euiTheme.size.s} 0;
            margin-block: ${euiTheme.size.xs};
            ${euiScrollBarStyles(euiThemeContext)}
          `}
        >
          <EuiFlexItem grow={false}>
            {isLoading ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiText size="s">
                <strong>
                  {i18n.translate('metricsExperience.grid.metricsCount.label', {
                    defaultMessage: '{count} {count, plural, one {metric} other {metrics}}',
                    values: { count: currentPageFields.length },
                  })}
                </strong>
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow>
            <MetricsGrid
              pivotOn="metric"
              columns={columns}
              dimensions={appliedDimensions}
              filters={filters}
              services={services}
              fields={currentPageFields}
              searchSessionId={searchSessionId}
              onBrushEnd={onBrushEnd}
              onFilter={onFilter}
              discoverFetch$={discoverFetch$}
              requestParams={requestParams}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={onPageChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChartSectionTemplate>
    </FullScreenWrapper>
  );
};
