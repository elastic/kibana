/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { PANEL_TYPES } from '../../../common/panel_types';

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

VisPickerItem.propTypes = {
  label: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.string,
  selected: PropTypes.bool,
};

export const VisPicker = injectI18n(function (props) {
  const handleChange = (type) => {
    props.onChange({ type });
  };

  const { model, intl } = props;
  const tabs = [
    {
      type: PANEL_TYPES.TIMESERIES,
      label: intl.formatMessage({
        id: 'visTypeTimeseries.visPicker.timeSeriesLabel',
        defaultMessage: 'Time Series',
      }),
    },
    {
      type: PANEL_TYPES.METRIC,
      label: intl.formatMessage({
        id: 'visTypeTimeseries.visPicker.metricLabel',
        defaultMessage: 'Metric',
      }),
    },
    {
      type: PANEL_TYPES.TOP_N,
      label: intl.formatMessage({
        id: 'visTypeTimeseries.visPicker.topNLabel',
        defaultMessage: 'Top N',
      }),
    },
    {
      type: PANEL_TYPES.GAUGE,
      label: intl.formatMessage({
        id: 'visTypeTimeseries.visPicker.gaugeLabel',
        defaultMessage: 'Gauge',
      }),
    },
    { type: PANEL_TYPES.MARKDOWN, label: 'Markdown' },
    {
      type: PANEL_TYPES.TABLE,
      label: intl.formatMessage({
        id: 'visTypeTimeseries.visPicker.tableLabel',
        defaultMessage: 'Table',
      }),
    },
  ].map((item) => {
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
});

VisPicker.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
};
