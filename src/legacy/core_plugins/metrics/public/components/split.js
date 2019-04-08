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
import uuid from 'uuid';

import { SplitByTerms } from './splits/terms';
import { SplitByFilter } from './splits/filter';
import SplitByFilters from './splits/filters';
import SplitByEverything from './splits/everything';

class Split extends Component {

  componentWillReceiveProps(nextProps) {
    const { model } = nextProps;
    if (model.split_mode === 'filters' && !model.split_filters) {
      this.props.onChange({
        split_filters: [
          { color: model.color, id: uuid.v1() }
        ]
      });
    }
  }

  render() {
    const { model, panel } = this.props;
    const indexPattern = model.override_index_pattern &&
      model.series_index_pattern ||
      panel.index_pattern;
    if (model.split_mode === 'filter') {
      return (
        <SplitByFilter
          model={model}
          onChange={this.props.onChange}
        />
      );
    }
    if (model.split_mode === 'filters') {
      return (
        <SplitByFilters
          model={model}
          onChange={this.props.onChange}
        />
      );
    }
    if (model.split_mode === 'terms') {
      return (
        <SplitByTerms
          model={model}
          indexPattern={indexPattern}
          fields={this.props.fields}
          onChange={this.props.onChange}
        />
      );
    }
    return (
      <SplitByEverything
        model={model}
        onChange={this.props.onChange}
      />
    );
  }

}

Split.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  panel: PropTypes.object
};

export default Split;
