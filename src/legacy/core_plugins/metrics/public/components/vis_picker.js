/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

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
      { label }
    </EuiTab>
  );
}

VisPickerItem.propTypes = {
  label: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.string,
  selected: PropTypes.bool
};

const VisPicker = injectI18n(function (props) {
  const handleChange = (type) => {
    props.onChange({ type });
  };

  const { model, intl } = props;
  const tabs = [
    { type: 'timeseries', label: intl.formatMessage({ id: 'tsvb.visPicker.timeSeriesLabel', defaultMessage: 'Time Series' }) },
    { type: 'metric', label: intl.formatMessage({ id: 'tsvb.visPicker.metricLabel', defaultMessage: 'Metric' }) },
    { type: 'top_n', label: intl.formatMessage({ id: 'tsvb.visPicker.topNLabel', defaultMessage: 'Top N' }) },
    { type: 'gauge', label: intl.formatMessage({ id: 'tsvb.visPicker.gaugeLabel', defaultMessage: 'Gauge' }) },
    { type: 'markdown', label: 'Markdown' },
    { type: 'table', label: intl.formatMessage({ id: 'tsvb.visPicker.tableLabel', defaultMessage: 'Table' }) }
  ].map(item => {
    return (
      <VisPickerItem
        key={item.type}
        onClick={handleChange}
        selected={item.type === model.type}
        {...item}
      />
    );
  });

  return (
    <EuiTabs>
      { tabs }
    </EuiTabs>
  );

});

VisPicker.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default VisPicker;
