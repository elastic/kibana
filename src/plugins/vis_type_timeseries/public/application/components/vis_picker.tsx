/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PANEL_TYPES } from '../../../common/panel_types';

const tabs = [
  {
    type: PANEL_TYPES.TIMESERIES,
    label: i18n.translate('visTypeTimeseries.visPicker.timeSeriesLabel', {
      defaultMessage: 'Time Series',
    }),
  },
  {
    type: PANEL_TYPES.METRIC,
    label: i18n.translate('visTypeTimeseries.visPicker.metricLabel', {
      defaultMessage: 'Metric',
    }),
  },
  {
    type: PANEL_TYPES.TOP_N,
    label: i18n.translate('visTypeTimeseries.visPicker.topNLabel', {
      defaultMessage: 'Top N',
    }),
  },
  {
    type: PANEL_TYPES.GAUGE,
    label: i18n.translate('visTypeTimeseries.visPicker.gaugeLabel', {
      defaultMessage: 'Gauge',
    }),
  },
  { type: PANEL_TYPES.MARKDOWN, label: 'Markdown' },
  {
    type: PANEL_TYPES.TABLE,
    label: i18n.translate('visTypeTimeseries.visPicker.tableLabel', {
      defaultMessage: 'Table',
    }),
  },
];

function VisPickerItem(props) {
  const { label, type, selected } = props;
  const itemClassName = 'tvbVisPickerItem';

  return (
    <EuiTab
      className={itemClassName}
      isSelected={selected}
      onClick={() => props.onClick(type)}
      data-test-subj={`${type}TsvbTypeBtn`}
    >
      {label}
    </EuiTab>
  );
}

export const VisPicker = ({ onChange, model }) => {
  const handleChange = (type) => {
    onChange({ type });
  };

  tabs.map((item) => {
    return (
      <VisPickerItem
        key={item.type}
        onClick={handleChange}
        selected={item.type === model.type}
        {...item}
      />
    );
  });

  return <EuiTabs>{tabs}</EuiTabs>;
};
