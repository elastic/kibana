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
import * as collectionActions from '../lib/collection_actions';
import AddDeleteButtons from '../add_delete_buttons';
import Select from 'react-select';
import { htmlIdGenerator } from '@elastic/eui';
import { createNewPercentile } from '../lib/create_new_percentile';

export class Percentiles extends Component {
  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleTextChange(item, name) {
    return e => {
      const handleChange = collectionActions.handleChange.bind(
        null,
        this.props
      );
      const part = {};
      part[name] = _.get(e, 'value', _.get(e, 'target.value'));
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow(row, i, items) {
    const defaults = { value: '', percentile: '', shade: '' };
    const model = { ...defaults, ...row };
    const handleAdd = collectionActions.handleAdd.bind(
      null,
      this.props,
      createNewPercentile
    );
    const handleDelete = collectionActions.handleDelete.bind(
      null,
      this.props,
      model
    );
    const modeOptions = [
      { label: 'Line', value: 'line' },
      { label: 'Band', value: 'band' },
    ];
    const optionsStyle = {};
    if (model.mode === 'line') {
      optionsStyle.display = 'none';
    }
    const htmlId = htmlIdGenerator(model.id);
    return (
      <div className="vis_editor__percentiles-row" key={model.id}>
        <div className="vis_editor__percentiles-content">
          <input
            aria-label="Percentile"
            placeholder="Percentile"
            className="vis_editor__input-grows"
            type="number"
            step="1"
            onChange={this.handleTextChange(model, 'value')}
            value={model.value}
          />
          <label className="vis_editor__label" htmlFor={htmlId('mode')}>
                        Mode
          </label>
          <div className="vis_editor__row_item">
            <Select
              inputProps={{ id: htmlId('mode') }}
              clearable={false}
              onChange={this.handleTextChange(model, 'mode')}
              options={modeOptions}
              value={model.mode}
            />
          </div>
          <label
            style={optionsStyle}
            className="vis_editor__label"
            htmlFor={htmlId('fillTo')}
          >
                        Fill To
          </label>
          <input
            id={htmlId('fillTo')}
            style={optionsStyle}
            className="vis_editor__input-grows"
            type="number"
            step="1"
            onChange={this.handleTextChange(model, 'percentile')}
            value={model.percentile}
          />
          <label
            style={optionsStyle}
            className="vis_editor__label"
            htmlFor={htmlId('shade')}
          >
                        Shade (0 to 1)
          </label>
          <input
            id={htmlId('shade')}
            style={optionsStyle}
            className="vis_editor__input-grows"
            type="number"
            step="0.1"
            onChange={this.handleTextChange(model, 'shade')}
            value={model.shade}
          />
        </div>
        <AddDeleteButtons
          onAdd={handleAdd}
          onDelete={handleDelete}
          disableDelete={items.length < 2}
        />
      </div>
    );
  }

  render() {
    const { model, name } = this.props;
    if (!model[name]) return <div />;

    const rows = model[name].map(this.renderRow);
    return <div className="vis_editor__percentiles">{rows}</div>;
  }
}

Percentiles.defaultProps = {
  name: 'percentile',
};

Percentiles.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  onChange: PropTypes.func,
};
