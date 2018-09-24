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
import React, { Component } from 'react';
import _ from 'lodash';
import uuid from 'uuid';
import AggRow from './agg_row';
import AggSelect from './agg_select';

import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import Vars from './vars';

import { htmlIdGenerator } from '@elastic/eui';

class CalculationAgg extends Component {

  componentWillMount() {
    if (!this.props.model.variables) {
      this.props.onChange(_.assign({}, this.props.model, {
        variables: [{ id: uuid.v1() }]
      }));
    }
  }

  render() {
    const { siblings } = this.props;

    const defaults = { script: '' };
    const model = { ...defaults, ...this.props.model };

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange);

    const htmlId = htmlIdGenerator();

    return (
      <AggRow
        disableDelete={this.props.disableDelete}
        model={this.props.model}
        onAdd={this.props.onAdd}
        onDelete={this.props.onDelete}
        siblings={this.props.siblings}
      >
        <div className="vis_editor__row_item">
          <div>
            <div className="vis_editor__label">Aggregation</div>
            <AggSelect
              panelType={this.props.panel.type}
              siblings={this.props.siblings}
              value={model.type}
              onChange={handleSelectChange('type')}
            />
            <div className="vis_editor__variables">
              <div className="vis_editor__label">Variables</div>
              <Vars
                metrics={siblings}
                onChange={handleChange}
                name="variables"
                model={model}
              />
            </div>
            <div className="vis_editor__row_item">
              <label className="vis_editor__label" htmlFor={htmlId('painless')}>
                Painless Script - Variables are keys on the <code>params</code>
                object, i.e. <code>params.&lt;name&gt;</code>.
                To access the bucket interval (in milliseconds) use <code>params._interval</code>.
              </label>
              <input
                id={htmlId('painless')}
                className="vis_editor__input-grows-100"
                type="text"
                onChange={handleTextChange('script')}
                value={model.script}
              />
            </div>
          </div>
        </div>
      </AggRow>
    );
  }

}

CalculationAgg.propTypes = {
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

export default CalculationAgg;
