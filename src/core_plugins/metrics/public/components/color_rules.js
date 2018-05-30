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
import AddDeleteButtons from './add_delete_buttons';
import * as collectionActions from './lib/collection_actions';
import ColorPicker from './color_picker';
import {
  htmlIdGenerator,
  EuiComboBox,
} from '@elastic/eui';

class ColorRules extends Component {

  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name, cast = String) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = cast(_.get(e, '[0].value', _.get(e, 'target.value')));
      if (part[name] === 'undefined') part[name] = undefined;
      if (part[name] === NaN) part[name] = undefined;
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow(row, i, items) {
    const defaults = { value: 0 };
    const model = { ...defaults, ...row };
    const handleAdd = collectionActions.handleAdd.bind(null, this.props);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, model);
    const operatorOptions = [
      { label: '> greater than', value: 'gt' },
      { label: '>= greater than or equal', value: 'gte' },
      { label: '< less than', value: 'lt' },
      { label: '<= less than or equal', value: 'lte' },
    ];
    const handleColorChange = (part) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      handleChange(_.assign({}, model, part));
    };
    const htmlId = htmlIdGenerator(model.id);
    const selectedOperatorOption = operatorOptions.find(option => {
      return model.opperator === option.value;
    });

    let secondary;
    if (!this.props.hideSecondary) {
      secondary = (
        <div className="color_rules__secondary">
          <div className="color_rules__label">and {this.props.secondaryName} to</div>
          <ColorPicker
            onChange={handleColorChange}
            name={this.props.secondaryVarName}
            value={model[this.props.secondaryVarName]}
          />
        </div>
      );
    }
    return (
      <div key={model.id} className="color_rules__rule">
        <div className="color_rules__label">Set {this.props.primaryName} to</div>
        <ColorPicker
          onChange={handleColorChange}
          name={this.props.primaryVarName}
          value={model[this.props.primaryVarName]}
        />
        { secondary }
        <label className="color_rules__label" htmlFor={htmlId('ifMetricIs')}>
          if metric is
        </label>
        <div className="color_rules__item">
          <EuiComboBox
            id={htmlId('ifMetricIs')}
            options={operatorOptions}
            selectedOptions={selectedOperatorOption ? [selectedOperatorOption] : []}
            onChange={this.handleChange(model, 'opperator')}
            singleSelection={true}
          />
        </div>
        <input
          aria-label="Value"
          className="color_rules__input"
          type="number"
          value={model.value}
          onChange={this.handleChange(model, 'value', Number)}
        />
        <div className="color_rules__control">
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
      <div className="color_rules">
        { rows }
      </div>
    );
  }

}

ColorRules.defaultProps = {
  name: 'color_rules',
  primaryName: 'background',
  primaryVarName: 'background_color',
  secondaryName: 'text',
  secondaryVarName: 'color',
  hideSecondary: false
};

ColorRules.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  onChange: PropTypes.func,
  primaryName: PropTypes.string,
  primaryVarName: PropTypes.string,
  secondaryName: PropTypes.string,
  secondaryVarName: PropTypes.string,
  hideSecondary: PropTypes.bool
};

export default ColorRules;
