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

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import classNames from 'classnames';
import React, { Component } from 'react';
import { IndexPattern } from 'ui/index_patterns';
import { FilterOptions } from 'ui/search_bar/components/filter_options';
import {
  disableFilter,
  enableFilter,
  MetaFilter,
  pinFilter,
  toggleFilterDisabled,
  toggleFilterNegated,
  unpinFilter,
} from '../filters';
import { FilterItem } from './filter_item';

interface Props {
  filters: MetaFilter[];
  onFiltersUpdated: (filters: MetaFilter[]) => void;
  className: string;
  indexPatterns: IndexPattern[];
}

export class FilterBar extends Component<Props> {
  public render() {
    const classes = classNames('globalFilterBar', this.props.className);

    return (
      <EuiFlexGroup
        className="globalFilterGroup"
        gutterSize="none"
        alignItems="flexStart"
        responsive={false}
      >
        <EuiFlexItem className="globalFilterGroup__branch" grow={false}>
          <FilterOptions
            onEnableAll={this.onEnableAll}
            onDisableAll={this.onDisableAll}
            onPinAll={this.onPinAll}
            onUnpinAll={this.onUnpinAll}
            onToggleAllNegated={this.onToggleAllNegated}
            onToggleAllDisabled={this.onToggleAllDisabled}
            onRemoveAll={this.onRemoveAll}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup
            className={classes}
            wrap={true}
            responsive={false}
            gutterSize="xs"
            alignItems="center"
          >
            {/* TODO display pinned filters first*/}
            {this.renderItems()}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderItems() {
    return this.props.filters.map((filter, i) => (
      <EuiFlexItem key={i} grow={false}>
        <FilterItem
          filter={filter}
          onUpdate={newFilter => this.onUpdate(i, newFilter)}
          onRemove={() => this.onRemove(i)}
          indexPatterns={this.props.indexPatterns}
        />
      </EuiFlexItem>
    ));
  }

  // private onAdd = (filter: MetaFilter) => {
  //   const filters = [...this.props.filters, filter];
  //   this.props.onFiltersUpdated(filters);
  // };

  private onRemove = (i: number) => {
    const filters = [...this.props.filters];
    filters.splice(i, 1);
    this.props.onFiltersUpdated(filters);
  };

  private onUpdate = (i: number, filter: MetaFilter) => {
    const filters = [...this.props.filters];
    filters[i] = filter;
    this.props.onFiltersUpdated(filters);
  };

  private onEnableAll = () => {
    const filters = this.props.filters.map(filter => enableFilter(filter));
    this.props.onFiltersUpdated(filters);
  };

  private onDisableAll = () => {
    const filters = this.props.filters.map(filter => disableFilter(filter));
    this.props.onFiltersUpdated(filters);
  };

  private onPinAll = () => {
    const filters = this.props.filters.map(filter => pinFilter(filter));
    this.props.onFiltersUpdated(filters);
  };

  private onUnpinAll = () => {
    const filters = this.props.filters.map(filter => unpinFilter(filter));
    this.props.onFiltersUpdated(filters);
  };

  private onToggleAllNegated = () => {
    const filters = this.props.filters.map(filter => toggleFilterNegated(filter));
    this.props.onFiltersUpdated(filters);
  };

  private onToggleAllDisabled = () => {
    const filters = this.props.filters.map(filter => toggleFilterDisabled(filter));
    this.props.onFiltersUpdated(filters);
  };

  private onRemoveAll = () => {
    this.props.onFiltersUpdated([]);
  };
}
