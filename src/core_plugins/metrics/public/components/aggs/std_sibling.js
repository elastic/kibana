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
import AggRow from './agg_row';
import MetricSelect from './metric_select';
import AggSelect from './agg_select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import {
  htmlIdGenerator,
  EuiComboBox,
} from '@elastic/eui';

export const StandardSiblingAgg = props => {
  const { siblings } = props;
  const defaults = { sigma: '' };
  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const stdDev = {};
  if (model.type === 'std_deviation_bucket') {
    stdDev.sigma = (
      <div className="vis_editor__std_deviation-sigma_item">
        <label className="vis_editor__label" htmlFor={htmlId('sigma')}>Sigma</label>
        <input
          id={htmlId('sigma')}
          className="vis_editor__std_deviation-sigma"
          value={model.sigma}
          onChange={handleTextChange('sigma')}
        />
      </div>
    );

    const modeOptions = [
      { label: 'Raw', value: 'raw' },
      { label: 'Upper Bound', value: 'upper' },
      { label: 'Lower Bound', value: 'lower' },
      { label: 'Bounds Band', value: 'band' }
    ];
    const selectedModeOption = modeOptions.find(option => {
      return model.mode === option.value;
    });

    stdDev.mode = (
      <div className="vis_editor__row_item">
        <label className="vis_editor__label" htmlFor={htmlId('mode')}>Mode</label>
        <EuiComboBox
          id={htmlId('mode')}
          options={modeOptions}
          selectedOptions={selectedModeOption ? [selectedModeOption] : []}
          onChange={handleSelectChange('mode')}
          singleSelection={true}
        />
      </div>
    );
  }

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <div className="vis_editor__row_item">
        <div className="vis_editor__label">Aggregation</div>
        <AggSelect
          panelType={props.panel.type}
          siblings={props.siblings}
          value={model.type}
          onChange={handleSelectChange('type')}
        />
      </div>
      <div className="vis_editor__std_sibling-metric">
        <div className="vis_editor__label">Metric</div>
        <MetricSelect
          onChange={handleSelectChange('field')}
          exclude={['percentile']}
          metrics={siblings}
          metric={model}
          value={model.field}
        />
      </div>
      { stdDev.sigma }
      { stdDev.mode }
    </AggRow>
  );
};

StandardSiblingAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};
