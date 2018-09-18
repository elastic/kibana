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

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSearchBar,
} from '@elastic/eui';

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

  render() {
    const { query, onQueryChange } = this.props;

    const box = {
      incremental: true,
      'aria-label': 'Search advanced settings' // hack until EuiSearchBar is fixed
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'category',
        name: 'Category',
        multiSelect: 'or',
        options: this.categories,
      }
    ];

    return (
      <EuiSearchBar
        box={box}
        filters={filters}
        onChange={onQueryChange}
        query={query}
      />

    );
  }
}
