/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { isGroupByFieldsEnabled } from '../../../common/check_ui_restrictions';
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
    const indexPattern = model.override_index_pattern
      ? model.series_index_pattern
      : panel.index_pattern;
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
