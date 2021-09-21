/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { isMetricEnabled } from '../../lib/check_ui_restrictions';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { getAggsByType, getAggsByPredicate } from '../../../../common/agg_utils';
import type { Agg } from '../../../../common/agg_utils';
import type { Metric } from '../../../../common/types';
import { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';
import { PanelModelContext } from '../../contexts/panel_model_context';
import { PANEL_TYPES, TIME_RANGE_DATA_MODES } from '../../../../common/enums';

type AggSelectOption = EuiComboBoxOptionOption;

const mapAggToSelectOption = ({ id, meta }: Agg) => ({ value: id, label: meta.label });

const {
  metric: metricAggs,
  parent_pipeline: pipelineAggs,
  sibling_pipeline: siblingAggs,
  special: specialAggs,
} = getAggsByType(mapAggToSelectOption);

const allAggOptions = [...metricAggs, ...pipelineAggs, ...siblingAggs, ...specialAggs];

function filterByPanelType(panelType: string) {
  return (agg: AggSelectOption) =>
    panelType === 'table' ? agg.value !== TSVB_METRIC_TYPES.SERIES_AGG : true;
}

export function isMetricAvailableForPanel(
  aggId: string,
  panelType: string,
  timeRangeMode?: string
) {
  if (
    panelType !== PANEL_TYPES.TIMESERIES &&
    timeRangeMode === TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE
  ) {
    return (
      !pipelineAggs.some((agg) => agg.value === aggId) && aggId !== TSVB_METRIC_TYPES.SERIES_AGG
    );
  }

  return true;
}

interface AggSelectUiProps {
  id: string;
  panelType: string;
  siblings: Metric[];
  value: string;
  uiRestrictions?: TimeseriesUIRestrictions;
  timeRangeMode?: string;
  onChange: (currentlySelectedOptions: AggSelectOption[]) => void;
}

export function AggSelect(props: AggSelectUiProps) {
  const panelModel = useContext(PanelModelContext);
  const { siblings, panelType, value, onChange, uiRestrictions, ...rest } = props;

  const selectedOptions = allAggOptions.filter((option) => {
    return value === option.value && isMetricEnabled(option.value, uiRestrictions);
  });

  let enablePipelines = siblings.some((s) => !!metricAggs.find((m) => m.value === s.type));

  if (siblings.length <= 1) enablePipelines = false;

  let options: EuiComboBoxOptionOption[];
  if (panelType === 'metrics') {
    options = metricAggs;
  } else if (panelType === 'filter_ratio') {
    options = getAggsByPredicate({ meta: { isFilterRatioSupported: true } }).map(
      mapAggToSelectOption
    );
  } else if (panelType === 'histogram') {
    options = getAggsByPredicate({ meta: { isHistogramSupported: true } }).map(
      mapAggToSelectOption
    );
  } else {
    const disableSiblingAggs = (agg: AggSelectOption) => ({
      ...agg,
      disabled:
        !enablePipelines ||
        !isMetricEnabled(agg.value, uiRestrictions) ||
        !isMetricAvailableForPanel(agg.value as string, panelType, panelModel?.time_range_mode),
    });

    options = [
      {
        label: i18n.translate('visTypeTimeseries.aggSelect.aggGroups.metricAggLabel', {
          defaultMessage: 'Metric Aggregations',
        }),
        options: metricAggs.map((agg) => ({
          ...agg,
          disabled: !isMetricEnabled(agg.value, uiRestrictions),
        })),
      },
      {
        label: i18n.translate('visTypeTimeseries.aggSelect.aggGroups.parentPipelineAggLabel', {
          defaultMessage: 'Parent Pipeline Aggregations',
        }),
        options: pipelineAggs.filter(filterByPanelType(panelType)).map(disableSiblingAggs),
      },
      {
        label: i18n.translate('visTypeTimeseries.aggSelect.aggGroups.siblingPipelineAggLabel', {
          defaultMessage: 'Sibling Pipeline Aggregations',
        }),
        options: siblingAggs.map(disableSiblingAggs),
      },
      {
        label: i18n.translate('visTypeTimeseries.aggSelect.aggGroups.specialAggLabel', {
          defaultMessage: 'Special Aggregations',
        }),
        options: specialAggs.map(disableSiblingAggs),
      },
    ];
  }

  const handleChange = (currentlySelectedOptions: AggSelectOption[]) => {
    if (!currentlySelectedOptions || currentlySelectedOptions.length <= 0) return;
    onChange(currentlySelectedOptions);
  };

  return (
    <div data-test-subj="aggSelector">
      <EuiComboBox
        isClearable={false}
        placeholder={i18n.translate('visTypeTimeseries.aggSelect.selectAggPlaceholder', {
          defaultMessage: 'Select aggregation',
        })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        singleSelection={{ asPlainText: true }}
        {...rest}
      />
    </div>
  );
}
