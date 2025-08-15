/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { css } from '@emotion/react';
import {
  FieldIcon,
  comboBoxFieldOptionMatcher,
  fieldSupportsBreakdown,
  getFieldIconProps,
} from '@kbn/field-utils';
import { i18n } from '@kbn/i18n';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import type {
  SelectableEntry,
  ToolbarSelectorProps,
} from '@kbn/unified-histogram/components/chart/toolbar_selector';
import {
  EMPTY_OPTION,
  ToolbarSelector,
} from '@kbn/unified-histogram/components/chart/toolbar_selector';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import React, { useCallback, useMemo } from 'react';

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
  timeRange,
}: ChartSectionProps) => {
  const [breakdownField, setBreakdown] = React.useState<DataViewField | undefined>(undefined);
  const actions: IconButtonGroupProps['buttons'] = [
    {
      iconType: 'search',
      label: i18n.translate('metricsExperience.searchButton', {
        defaultMessage: 'Search',
      }),

      onClick: () => {},
      'data-test-subj': 'metricsExperienceEditVisualization',
    },
    {
      iconType: 'fullScreen',
      label: i18n.translate('metricsExperience.fullScreenButton', {
        defaultMessage: 'Full screen',
      }),

      onClick: () => {},
      'data-test-subj': 'metricsExperienceEditVisualization',
    },
  ];

  const fields = useMemo(() => dataView.fields.filter(fieldSupportsBreakdown), [dataView]);
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
        prepend: (
          <span
            css={css`
              .euiToken {
                vertical-align: middle;
              }
            `}
          >
            <FieldIcon {...getFieldIconProps(field)} />
          </span>
        ),
      }))
      .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

    options.unshift({
      key: EMPTY_OPTION,
      value: EMPTY_OPTION,
      label: i18n.translate('metricsExperience.breakdownFieldSelector.noBreakdownButtonLabel', {
        defaultMessage: 'No breakdown',
      }),
      checked: !breakdownField ? ('on' as EuiSelectableOption['checked']) : undefined,
    });

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

  // The structure here is VERY similar to that of the `chart.tsx` component
  // Perhaps there should be a shared template for this?
  return (
    <EuiFlexGroup
      className="metricsExperience__chart"
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false} css={chartToolbarCss}>
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                {renderToggleActions ? renderToggleActions() : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                <div>
                  {/* if we need to use <ToolbarSelector /> for our custom dropdowns, 
                  this component needs to be moved to another package  */}
                  <ToolbarSelector
                    data-test-subj="metricsExperienceBreakdownSelector"
                    data-selected-value=""
                    searchable
                    buttonLabel="Metrics Experience Breakdown by"
                    popoverTitle={i18n.translate(
                      'metricsExperience.breakdownFieldSelector.breakdownFieldPopoverTitle',
                      {
                        defaultMessage: 'Select breakdown field',
                      }
                    )}
                    optionMatcher={comboBoxFieldOptionMatcher}
                    options={fieldOptions}
                    onChange={onChange}
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <IconButtonGroup
              legend={i18n.translate('metricsExperience.chartActionsGroupLegend', {
                defaultMessage: 'Chart actions',
              })}
              buttonSize="s"
              buttons={actions}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <section css={histogramCss} tabIndex={-1}>
          {'Dummy Metrics Grid'}
        </section>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default DummyMetricsGrid;
