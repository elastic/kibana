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
import { get } from 'lodash';
import { SplitByTerms } from './splits/terms';
import { SplitByFilter } from './splits/filter';
import { SplitByFilters } from './splits/filters';
import { SplitByEverything } from './splits/everything';
import { SplitUnsupported } from './splits/unsupported_split';
import { isGroupByFieldsEnabled } from '../lib/check_ui_restrictions';
import { getDefaultQueryLanguage } from './lib/get_default_query_language';

const SPLIT_MODES = {
  FILTERS: 'filters',
  FILTER: 'filter',
  TERMS: 'terms',
  EVERYTHING: 'everything',
};

export class Split extends Component {
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { model } = nextProps;
    if (model.split_mode === 'filters' && !model.split_filters) {
      this.props.onChange({
        split_filters: [
          {
            color: model.color,
            id: uuid.v1(),
            filter: {
              query: '',
              language: getDefaultQueryLanguage(),
            },
          },
        ],
      });
    }
  }

  getComponent(splitMode, uiRestrictions) {
    if (!isGroupByFieldsEnabled(splitMode, uiRestrictions)) {
      return SplitUnsupported;
    }

    switch (splitMode) {
      case SPLIT_MODES.TERMS:
        return SplitByTerms;
      case SPLIT_MODES.FILTER:
        return SplitByFilter;
      case SPLIT_MODES.FILTERS:
        return SplitByFilters;
      default:
        return SplitByEverything;
    }
  }

  render() {
    const { model, panel, uiRestrictions, seriesQuantity } = this.props;
    const indexPattern =
      (model.override_index_pattern && model.series_index_pattern) || panel.index_pattern;
    const splitMode = get(this.props, 'model.split_mode', SPLIT_MODES.EVERYTHING);
    const Component = this.getComponent(splitMode, uiRestrictions);

    return (
      <Component
        model={model}
        indexPattern={indexPattern}
        fields={this.props.fields}
        onChange={this.props.onChange}
        uiRestrictions={uiRestrictions}
        seriesQuantity={seriesQuantity}
      />
    );
  }
}

Split.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  panel: PropTypes.object,
  seriesQuantity: PropTypes.object,
};
