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
import { FilterOptions } from 'ui/search_bar/components/filter_options';
import {
  disableFilter,
  enableFilter,
  MetaFilter,
  pinFilter,
  toggleFilterDisabled,
  toggleFilterNegated,
  toggleFilterPinned,
  unpinFilter,
} from '../filters';
import { FilterItem } from './filter_item';

interface Props {
  filters: MetaFilter[];
  onFiltersUpdated: (filters: MetaFilter[]) => void;
  className: string;
}

export class FilterBar extends Component<Props> {
  public onToggleNegated = (i: number) => {
    const filters = [...this.props.filters];
    filters[i] = toggleFilterNegated(filters[i]);
    this.props.onFiltersUpdated(filters);
  };

  public onTogglePinned = (i: number) => {
    const filters = [...this.props.filters];
    filters[i] = toggleFilterPinned(filters[i]);
    this.props.onFiltersUpdated(filters);
  };

  public onToggleDisabled = (i: number) => {
    const filters = [...this.props.filters];
    filters[i] = toggleFilterDisabled(filters[i]);
    this.props.onFiltersUpdated(filters);
  };

  public onAdd = (filter: MetaFilter) => {
    const filters = [...this.props.filters, filter];
    this.props.onFiltersUpdated(filters);
  };

  public onRemove = (i: number) => {
    const filters = [...this.props.filters];
    filters.splice(i, 1);
    this.props.onFiltersUpdated(filters);
  };

  public onUpdate = (i: number, filter: MetaFilter) => {
    const filters = [...this.props.filters];
    filters[i] = filter;
    this.props.onFiltersUpdated(filters);
  };

  public onEnableAll = () => {
    const filters = this.props.filters.map(filter => enableFilter(filter));
    this.props.onFiltersUpdated(filters);
  };

  public onDisableAll = () => {
    const filters = this.props.filters.map(filter => disableFilter(filter));
    this.props.onFiltersUpdated(filters);
  };

  public onPinAll = () => {
    const filters = this.props.filters.map(filter => pinFilter(filter));
    this.props.onFiltersUpdated(filters);
  };

  public onUnpinAll = () => {
    const filters = this.props.filters.map(filter => unpinFilter(filter));
    this.props.onFiltersUpdated(filters);
  };

  public onToggleAllNegated = () => {
    const filters = this.props.filters.map(filter => toggleFilterNegated(filter));
    this.props.onFiltersUpdated(filters);
  };

  public onToggleAllDisabled = () => {
    const filters = this.props.filters.map(filter => toggleFilterDisabled(filter));
    this.props.onFiltersUpdated(filters);
  };

  public onRemoveAll = () => {
    this.props.onFiltersUpdated([]);
  };

  public render() {
    const classes = classNames('globalFilterBar', this.props.className);

    const filterItems = this.props.filters.map((filter, i) => {
      return (
        <EuiFlexItem key={i} grow={false}>
          <FilterItem
            filter={filter}
            onTogglePinned={() => this.onTogglePinned(i)}
            onToggleNegated={() => this.onToggleNegated(i)}
            onToggleDisabled={() => this.onToggleDisabled(i)}
            onRemove={() => this.onRemove(i)}
          />
        </EuiFlexItem>
      );
    });

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
            {filterItems}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
