/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import {
  ChartSectionTemplate,
  ToolbarSelector,
  type ToolbarSelectorProps,
  type SelectableEntry,
} from '@kbn/unified-histogram';

// Dummy component to demonstrate how the actual metrics experience grid will hook into discover state and event handlers
export const DummyMetricsGrid = ({
  dataView,
  renderToggleActions,
  chartToolbarCss,
  histogramCss,
  services,
  abortController,
  onBrushEnd,
  onFilter,
  query,
  searchSessionId,
  getTimeRange,
}: ChartSectionProps) => {
  const [breakdownField, setBreakdown] = React.useState<DataViewField | undefined>(undefined);
  const actions: IconButtonGroupProps['buttons'] = [
    {
      iconType: 'search',
      label: i18n.translate('discover.metricsExperience.searchButton', {
        defaultMessage: 'Search',
      }),

      onClick: () => {},
      'data-test-subj': 'metricsExperienceEditVisualization',
    },
    {
      iconType: 'fullScreen',
      label: i18n.translate('discover.metricsExperience.fullScreenButton', {
        defaultMessage: 'Full screen',
      }),

      onClick: () => {},
      'data-test-subj': 'metricsExperienceEditVisualization',
    },
  ];

  const fields = useMemo(() => dataView.fields.filter((p) => p.timeSeriesDimension), [dataView]);
  const fieldOptions: SelectableEntry[] = useMemo(() => {
    const options: SelectableEntry[] = fields
      .map((field) => ({
        key: field.name,
        name: field.name,
        label: field.displayName,
        value: field.name,
        checked:
          breakdownField?.name === field.name
            ? ('on' as EuiSelectableOption['checked'])
            : undefined,
      }))
      .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

    return options;
  }, [fields, breakdownField]);

  const onChange = useCallback<NonNullable<ToolbarSelectorProps['onChange']>>(
    (chosenOption) => {
      const newField = chosenOption?.value
        ? fields.find((currentField) => currentField.name === chosenOption.value)
        : undefined;
      setBreakdown(newField);
    },
    [fields, setBreakdown]
  );

  const leftSideComponents = useMemo(
    () => [
      renderToggleActions(),
      <ToolbarSelector
        data-test-subj="metricsExperienceBreakdownSelector"
        data-selected-value=""
        searchable
        buttonLabel="Metrics Experience Breakdown by"
        popoverTitle={i18n.translate(
          'discover.metricsExperience.breakdownFieldSelector.breakdownFieldPopoverTitle',
          {
            defaultMessage: 'Select breakdown field',
          }
        )}
        optionMatcher={({ option, normalizedSearchValue }) => {
          return 'name' in option
            ? String(option.name ?? '').includes(normalizedSearchValue)
            : option.label.includes(normalizedSearchValue);
        }}
        options={fieldOptions}
        onChange={onChange}
      />,
    ],
    [fieldOptions, onChange, renderToggleActions]
  );

  return (
    <ChartSectionTemplate
      id="unifiedMetricsExperienceGridPanel"
      toolbarCss={chartToolbarCss}
      toolbar={{
        leftSide: leftSideComponents,
        rightSide: actions,
      }}
    >
      <div css={histogramCss}>{'Dummy Metrics Grid'}</div>
    </ChartSectionTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default DummyMetricsGrid;
