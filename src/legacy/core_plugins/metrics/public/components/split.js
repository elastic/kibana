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
import chrome from 'ui/chrome';
import { SplitByTerms } from './splits/terms';
import { SplitByFilter } from './splits/filter';
import { SplitByFilters } from './splits/filters';
import { SplitByEverything } from './splits/everything';
import { SplitUnsupported } from './splits/unsupported_split';
import { isGroupByFieldsEnabled } from '../lib/check_ui_restrictions';
import { fetchIndexPatterns } from '../lib/fetch_index_patterns';

const uiSettingsQueryLanguage = chrome.getUiSettingsClient().get('search:queryLanguage');

const SPLIT_MODES = {
  FILTERS: 'filters',
  FILTER: 'filter',
  TERMS: 'terms',
  EVERYTHING: 'everything',
};
// add indexPattern fetching in here to pass down to SplitByFilter and SplitByFilters, we need to work off of the panel prop to get the index pattern name. The model passed down in here is only a partial version of the overall model.

class Split extends Component {
  constructor(props) {
    super(props);
    this.state = {
      indexPatternForQuery: {},
    };
  }
  async componentDidMount() {
    await this.fetchIndexPatternsForQuery();
  }

  componentWillReceiveProps(nextProps) {
    const { model } = nextProps;
    if (model.split_mode === 'filters' && !model.split_filters) {
      this.props.onChange({
        split_filters: [
          {
            color: model.color,
            id: uuid.v1(),
            filter: {
              query: '',
              language: uiSettingsQueryLanguage
            }
          },
        ],
      });
    }
  }

  fetchIndexPatternsForQuery = async () => {
    const searchIndexPattern = this.indexPatternFromProps();
    const indexPatternObject = await fetchIndexPatterns(searchIndexPattern);
    this.setState({ indexPatternForQuery: indexPatternObject });
  }

  indexPatternFromProps() {
    let searchIndexPattern = this.props.panel.default_index_pattern;
    if (this.props.model.override_index_pattern && this.props.model.series_index_pattern) {
      searchIndexPattern = this.props.model.series_index_pattern;
    } else if (this.props.panel.index_pattern) {
      searchIndexPattern = this.props.panel.index_pattern;
    }
    return searchIndexPattern;
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
    const { model, panel, uiRestrictions } = this.props;
    const indexPattern =
      (model.override_index_pattern && model.series_index_pattern) || panel.index_pattern;

    const splitMode = get(this.props, 'model.split_mode', SPLIT_MODES.EVERYTHING);

    const Component = this.getComponent(splitMode, uiRestrictions);
    if (splitMode === SPLIT_MODES.FILTER || splitMode === SPLIT_MODES.FILTERS) {
      return (
        <Component
          model={model}
          indexPattern={this.state.indexPattern}
          fields={this.props.fields}
          onChange={this.props.onChange}
          uiRestrictions={uiRestrictions}
          indexPatterns={[this.state.indexPatternForQuery]}
        />
      );
    }
    return (
      <Component
        model={model}
        indexPattern={indexPattern}
        fields={this.props.fields}
        onChange={this.props.onChange}
        uiRestrictions={uiRestrictions}
        indexPatterns={this.state.indexPatternForQuery}
      />
    );
  }
}

Split.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  panel: PropTypes.object,
};

export default Split;
