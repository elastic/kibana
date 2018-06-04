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
import AggSelect from './agg_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import {
  htmlIdGenerator,
  EuiComboBox,
} from '@elastic/eui';

function SeriesAgg(props) {
  const { panel, model } = props;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);

  const htmlId = htmlIdGenerator();

  const functionOptions = [
    { label: 'Sum', value: 'sum' },
    { label: 'Max', value: 'max' },
    { label: 'Min', value: 'min' },
    { label: 'Avg', value: 'mean' },
    { label: 'Overall Sum', value: 'overall_sum' },
    { label: 'Overall Max', value: 'overall_max' },
    { label: 'Overall Min', value: 'overall_min' },
    { label: 'Overall Avg', value: 'overall_avg' },
    { label: 'Cumlative Sum', value: 'cumlative_sum' },
  ];
  const selectedFunctionOption = functionOptions.find(option => {
    return model.function === option.value;
  });

  if (panel.type === 'table') {
    return (
      <AggRow
        disableDelete={props.disableDelete}
        model={props.model}
        onAdd={props.onAdd}
        onDelete={props.onDelete}
        siblings={props.siblings}
      >
        <div className="vis_editor__item">
          <div className="vis_editor__label">
            Series Agg is not compatible with the table visualization.
          </div>
        </div>
      </AggRow>
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
      <div className="vis_editor__item">
        <div className="vis_editor__label">Aggregation</div>
        <AggSelect
          panelType={panel.type}
          siblings={props.siblings}
          value={model.type}
          onChange={handleSelectChange('type')}
        />
      </div>
      <div className="vis_editor__item">
        <label className="vis_editor__label" htmlFor={htmlId('function')}>Function</label>
        <EuiComboBox
          id={htmlId('function')}
          options={functionOptions}
          selectedOptions={selectedFunctionOption ? [selectedFunctionOption] : []}
          onChange={handleSelectChange('function')}
          singleSelection={true}
        />
      </div>
    </AggRow>
  );

}

SeriesAgg.propTypes = {
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

export default SeriesAgg;
