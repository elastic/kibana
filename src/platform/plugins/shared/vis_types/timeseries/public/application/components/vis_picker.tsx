/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PANEL_TYPES } from '../../../common/enums';
import { TimeseriesVisParams } from '../../types';

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

interface VisPickerProps {
  onChange: (partialModel: Partial<TimeseriesVisParams>) => void;
  currentVisType: TimeseriesVisParams['type'];
}

export const VisPicker = ({ onChange, currentVisType }: VisPickerProps) => {
  return (
    <EuiTabs size="l">
      {tabs.map(({ label, type }) => (
        <EuiTab
          key={type}
          isSelected={type === currentVisType}
          onClick={() => onChange({ type })}
          data-test-subj={`${type}TsvbTypeBtn`}
        >
          {label}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
