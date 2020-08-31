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
import { createSelector } from 'reselect';

import { EuiSpacer } from '@elastic/eui';
import { AddFilter, Table, Header, DeleteFilterConfirmationModal } from './components';
import { IIndexPattern } from '../../../../../../plugins/data/public';
import { SourceFiltersTableFilter } from './types';

export interface SourceFiltersTableProps {
  indexPattern: IIndexPattern;
  filterFilter: string;
  fieldWildcardMatcher: Function;
  onAddOrRemoveFilter?: Function;
}

export interface SourceFiltersTableState {
  filterToDelete: any;
  isDeleteConfirmationModalVisible: boolean;
  isSaving: boolean;
  filters: SourceFiltersTableFilter[];
}

export class SourceFiltersTable extends Component<
  SourceFiltersTableProps,
  SourceFiltersTableState
> {
  // Source filters do not have any unique ids, only the value is stored.
  // To ensure we can create a consistent and expected UX when managing
  // source filters, we are assigning a unique id to each filter on the
  // client side only
  private clientSideId: number = 0;

  constructor(props: SourceFiltersTableProps) {
    super(props);

    this.state = {
      filterToDelete: undefined,
      isDeleteConfirmationModalVisible: false,
      isSaving: false,
      filters: [],
    };
  }

  UNSAFE_componentWillMount() {
    this.updateFilters();
  }

  updateFilters = () => {
    const sourceFilters = this.props.indexPattern.sourceFilters;
    const filters = (sourceFilters || []).map((sourceFilter: any) => ({
      ...sourceFilter,
      clientId: ++this.clientSideId,
    }));

    this.setState({ filters });
  };

  getFilteredFilters = createSelector(
    (state: SourceFiltersTableState) => state.filters,
    (state: SourceFiltersTableState, props: SourceFiltersTableProps) => props.filterFilter,
    (filters, filterFilter) => {
      if (filterFilter) {
        const filterFilterToLowercase = filterFilter.toLowerCase();
        return filters.filter((filter) =>
          filter.value.toLowerCase().includes(filterFilterToLowercase)
        );
      }

      return filters;
    }
  );

  startDeleteFilter = (filter: SourceFiltersTableFilter) => {
    this.setState({
      filterToDelete: filter,
      isDeleteConfirmationModalVisible: true,
    });
  };

  hideDeleteConfirmationModal = () => {
    this.setState({
      filterToDelete: undefined,
      isDeleteConfirmationModalVisible: false,
    });
  };

  deleteFilter = async () => {
    const { indexPattern, onAddOrRemoveFilter } = this.props;
    const { filterToDelete, filters } = this.state;

    indexPattern.sourceFilters = filters.filter((filter) => {
      return filter.clientId !== filterToDelete.clientId;
    });

    this.setState({ isSaving: true });
    await indexPattern.save();

    if (onAddOrRemoveFilter) {
      onAddOrRemoveFilter();
    }

    this.updateFilters();
    this.setState({ isSaving: false });
    this.hideDeleteConfirmationModal();
  };

  onAddFilter = async (value: string) => {
    const { indexPattern, onAddOrRemoveFilter } = this.props;

    indexPattern.sourceFilters = [...(indexPattern.sourceFilters || []), { value }];

    this.setState({ isSaving: true });
    await indexPattern.save();

    if (onAddOrRemoveFilter) {
      onAddOrRemoveFilter();
    }

    this.updateFilters();
    this.setState({ isSaving: false });
  };

  saveFilter = async ({ clientId, value }: SourceFiltersTableFilter) => {
    const { indexPattern } = this.props;
    const { filters } = this.state;

    indexPattern.sourceFilters = filters.map((filter) => {
      if (filter.clientId === clientId) {
        return {
          value,
          clientId,
        };
      }

      return filter;
    });

    this.setState({ isSaving: true });
    await indexPattern.save();
    this.updateFilters();
    this.setState({ isSaving: false });
  };

  render() {
    const { indexPattern, fieldWildcardMatcher } = this.props;
    const { isSaving, filterToDelete } = this.state;
    const filteredFilters = this.getFilteredFilters(this.state, this.props);

    return (
      <>
        <Header />
        <AddFilter onAddFilter={this.onAddFilter} />
        <EuiSpacer size="l" />
        <Table
          isSaving={isSaving}
          indexPattern={indexPattern}
          items={filteredFilters}
          fieldWildcardMatcher={fieldWildcardMatcher}
          deleteFilter={this.startDeleteFilter}
          saveFilter={this.saveFilter}
        />

        {filterToDelete && (
          <DeleteFilterConfirmationModal
            filterToDeleteValue={filterToDelete.value}
            onCancelConfirmationModal={this.hideDeleteConfirmationModal}
            onDeleteFilter={this.deleteFilter}
          />
        )}
      </>
    );
  }
}
