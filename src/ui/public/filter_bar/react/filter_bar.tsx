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

import React, { Component } from 'react';
import { createFilterBarFilter } from 'ui/filter_bar/filters/filter_bar_filters';
import { createPhraseFilter } from 'ui/filter_bar/filters/phrase_filter';
import { FilterItem } from 'ui/filter_bar/react/filter_item';

const filters = [
  createPhraseFilter({ field: 'response', value: 200, index: 'foo' }),
  createPhraseFilter({ field: 'extension', value: 'jpg', index: 'foo' }),
  createPhraseFilter({ field: 'bytes', value: 2000, index: 'foo' }),
];

const filterBarFilters = filters.map(createFilterBarFilter);

export class FilterBar extends Component {
  public render() {
    const filterItems = filterBarFilters.map(filterBarFilter => {
      return <FilterItem filter={filterBarFilter} />;
    });

    return filterItems;
  }
}
