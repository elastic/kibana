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

function VisPickerItem(props) {
  const { label, icon, type } = props;
  let itemClassName = 'vis_editor__vis_picker-item';
  let iconClassName = 'vis_editor__vis_picker-icon';
  let labelClassName = 'vis_editor__vis_picker-label';
  if (props.selected) {
    itemClassName += ' selected';
    iconClassName += ' selected';
    labelClassName += ' selected';
  }
  return (
    <button
      role="tab"
      className={itemClassName}
      onClick={() => props.onClick(type)}
      data-test-subj={`${type}TsvbTypeBtn`}
    >
      <div className={iconClassName}>
        <i className={`fa ${icon}`} />
      </div>
      <div className={labelClassName}>
        { label }
      </div>
    </button>
  );
}

VisPickerItem.propTypes = {
  icon: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.string,
  selected: PropTypes.bool
};

function VisPicker(props) {
  const handleChange = (type) => {
    props.onChange({ type });
  };

  const { model } = props;
  const icons = [
    { type: 'timeseries', icon: 'fa-line-chart', label: 'Time Series' },
    { type: 'metric', icon: 'fa-superscript', label: 'Metric' },
    { type: 'top_n', icon: 'fa-bar-chart fa-rotate-90', label: 'Top N' },
    { type: 'gauge', icon: 'fa-circle-o-notch', label: 'Gauge' },
    { type: 'markdown', icon: 'fa-paragraph', label: 'Markdown' },
    { type: 'table', icon: 'fa-paragraph', label: 'Table' }
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
    <div className="vis_editor__vis_picker-container" role="tablist">
      { icons }
    </div>
  );

}

VisPicker.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default VisPicker;
