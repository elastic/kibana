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

import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import { EuiSearchBar, EuiFormErrorText } from '@elastic/eui';

import { getCategoryName } from '../../lib';

export class Search extends PureComponent {
  static propTypes = {
    categories: PropTypes.array.isRequired,
    query: PropTypes.object.isRequired,
    onQueryChange: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    const { categories } = props;
    this.categories = categories.map(category => {
      return {
        value: category,
        name: getCategoryName(category),
      };
    });
  }

  state = {
    isSearchTextValid: true,
    parseErrorMessage: null,
  };

  onChange = ({ query, error }) => {
    if (error) {
      this.setState({
        isSearchTextValid: false,
        parseErrorMessage: error.message,
      });
      return;
    }

    this.setState({
      isSearchTextValid: true,
      parseErrorMessage: null,
    });
    this.props.onQueryChange({ query });
  };

  render() {
    const { query } = this.props;

    const box = {
      incremental: true,
      'data-test-subj': 'settingsSearchBar',
      'aria-label': i18n.translate('kbn.management.settings.searchBarAriaLabel', {
        defaultMessage: 'Search advanced settings',
      }), // hack until EuiSearchBar is fixed
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'category',
        name: i18n.translate('kbn.management.settings.categorySearchLabel', {
          defaultMessage: 'Category',
        }),
        multiSelect: 'or',
        options: this.categories,
      },
    ];

    let queryParseError;
    if (!this.state.isSearchTextValid) {
      const parseErrorMsg = i18n.translate(
        'kbn.management.settings.searchBar.unableToParseQueryErrorMessage',
        { defaultMessage: 'Unable to parse query' }
      );
      queryParseError = (
        <EuiFormErrorText>{`${parseErrorMsg}. ${this.state.parseErrorMessage}`}</EuiFormErrorText>
      );
    }

    return (
      <Fragment>
        <EuiSearchBar box={box} filters={filters} onChange={this.onChange} query={query} />
        {queryParseError}
      </Fragment>
    );
  }
}
