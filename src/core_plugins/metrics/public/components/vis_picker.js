import PropTypes from 'prop-types';
import React from 'react';
import { KuiLocalNav, KuiLocalNavRow, KuiLocalTab, KuiLocalTabs } from './core';

const nav = [
  { type: 'timeseries', label: 'Time Series' },
  { type: 'metric', label: 'Metric' },
  { type: 'top_n', label: 'Top N' },
  { type: 'gauge', label: 'Gauge' },
  { type: 'markdown', label: 'Markdown' }
];

const VisPicker = ({ onChange, model }) => (
  <KuiLocalNav>
    <KuiLocalNavRow isSecondary>
      <KuiLocalTabs>
        {nav.map(({ label, type }) => (
          <KuiLocalTab key={type} onClick={() => onChange({ type })} isSelected={type === model.type}>
            {label}
          </KuiLocalTab>
        ))}
      </KuiLocalTabs>
    </KuiLocalNavRow>
  </KuiLocalNav>
);

VisPicker.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default VisPicker;
