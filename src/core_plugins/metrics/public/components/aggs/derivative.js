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
import MetricSelect from './metric_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import { htmlIdGenerator } from '@elastic/eui';

export const DerivativeAgg = props => {
  const { siblings } = props;

  const defaults = { unit: '' };
  const model = { ...defaults, ...props.model };

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const htmlId = htmlIdGenerator();

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
      <div className="vis_editor__row_item">
        <div className="vis_editor__label">Metric</div>
        <MetricSelect
          onChange={handleSelectChange('field')}
          metrics={siblings}
          metric={model}
          value={model.field}
        />
      </div>
      <div>
        <label className="vis_editor__label" htmlFor={htmlId('units')}>
          Units (1s, 1m, etc)
        </label>
        <input
          id={htmlId('units')}
          className="vis_editor__input"
          onChange={handleTextChange('unit')}
          value={model.unit}
          type="text"
        />
      </div>
    </AggRow>
  );
};

DerivativeAgg.propTypes = {
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
