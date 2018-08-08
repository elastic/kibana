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
import ColorPicker from '../color_picker';
import uuid from 'uuid';
class FilterItems extends Component {

  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      handleChange(_.assign({}, item, {
        [name]: _.get(e, 'value', _.get(e, 'target.value'))
      }));
    };
  }

  renderRow(row, i, items) {
    const defaults = { filter: '', label: '' };
    const model = { ...defaults, ...row };
    const handleChange = (part) => {
      const fn = collectionActions.handleChange.bind(null, this.props);
      fn(_.assign({}, model, part));
    };
    const newFilter = () => ({ color: this.props.model.color, id: uuid.v1() });
    const handleAdd = collectionActions.handleAdd
      .bind(null, this.props, newFilter);
    const handleDelete = collectionActions.handleDelete
      .bind(null, this.props, model);
    return  (
      <div className="vis_editor__split-filter-row" key={model.id}>
        <div className="vis_editor__split-filter-color">
          <ColorPicker
            disableTrash={true}
            onChange={handleChange}
            name="color"
            value={model.color}
          />
        </div>
        <div className="vis_editor__split-filter-item">
          <input
            placeholder="Filter"
            className="vis_editor__input-grows-100"
            type="text"
            onChange={this.handleChange(model, 'filter')}
            value={model.filter}
          />
        </div>
        <div className="vis_editor__split-filter-item">
          <input
            placeholder="Label"
            className="vis_editor__input-grows-100"
            type="text"
            onChange={this.handleChange(model, 'label')}
            value={model.label}
          />
        </div>
        <div className="vis_editor__split-filter-control">
          <AddDeleteButtons
            onAdd={handleAdd}
            onDelete={handleDelete}
            disableDelete={items.length < 2}
          />
        </div>
      </div>
    );
  }

  render() {
    const { model, name } = this.props;
    if (!model[name]) return (<div/>);
    const rows = model[name].map(this.renderRow);
    return (
      <div className="vis_editor__split-filters">
        { rows }
      </div>
    );
  }

}

FilterItems.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default FilterItems;
