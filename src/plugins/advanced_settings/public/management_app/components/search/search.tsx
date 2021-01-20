/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Fragment, PureComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSearchBar, EuiFormErrorText, Query } from '@elastic/eui';

import { getCategoryName } from '../../lib';

interface SearchProps {
  categories: string[];
  query: Query;
  onQueryChange: ({ query }: { query: Query }) => void;
}

export class Search extends PureComponent<SearchProps> {
  private categories: Array<{ value: string; name: string }> = [];

  constructor(props: SearchProps) {
    super(props);
    const { categories } = props;
    this.categories = categories.map((category) => {
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

  onChange = ({ query, error }: { query: Query | null; error: { message: string } | null }) => {
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
    this.props.onQueryChange({ query: query! });
  };

  render() {
    const { query } = this.props;

    const box = {
      incremental: true,
      'data-test-subj': 'settingsSearchBar',
      'aria-label': i18n.translate('advancedSettings.searchBarAriaLabel', {
        defaultMessage: 'Search advanced settings',
      }), // hack until EuiSearchBar is fixed
    };

    const filters = [
      {
        type: 'field_value_selection' as const,
        field: 'category',
        name: i18n.translate('advancedSettings.categorySearchLabel', {
          defaultMessage: 'Category',
        }),
        multiSelect: 'or' as const,
        options: this.categories,
      },
    ];

    let queryParseError;
    if (!this.state.isSearchTextValid) {
      const parseErrorMsg = i18n.translate(
        'advancedSettings.searchBar.unableToParseQueryErrorMessage',
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
