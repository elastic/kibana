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

import { isMetricEnabled } from '../../../../common/check_ui_restrictions';
import { VisDataContext } from '../../contexts/vis_data_context';
import { getAggsByType, getAggsByPredicate } from '../../../../common/agg_utils';
import type { Agg } from '../../../../common/agg_utils';
import type { Metric } from '../../../../common/types';

type AggSelectOption = EuiComboBoxOptionOption;

const mapAggToSelectOption = ({ id, meta }: Agg) => ({ value: id, label: meta.label });

const {
  metric: metricAggs,
  parent_pipeline: pipelineAggs,
  sibling_pipeline: siblingAggs,
  special: specialAggs,
} = getAggsByType(mapAggToSelectOption);

const allAggOptions = [...metricAggs, ...pipelineAggs, ...siblingAggs, ...specialAggs];

interface AggSelectUiProps {
  id: string;
  panelType: string;
  siblings: Metric[];
  value: string;
  timeRangeMode?: string;
  onChange: (currentlySelectedOptions: AggSelectOption[]) => void;
}

export function AggSelect(props: AggSelectUiProps) {
  const { siblings, panelType, value, onChange, ...rest } = props;
  const { uiRestrictions } = useContext(VisDataContext) ?? {};

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
      disabled: !enablePipelines || !isMetricEnabled(agg.value as string, uiRestrictions),
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
        options: pipelineAggs.map(disableSiblingAggs),
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
