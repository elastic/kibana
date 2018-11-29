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
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import {
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { Table } from './components/table';
import { Header } from './components/header';
import { AddFilter } from './components/add_filter';
import { FormattedMessage } from '@kbn/i18n/react';

export class SourceFiltersTable extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    filterFilter: PropTypes.string,
    fieldWildcardMatcher: PropTypes.func.isRequired,
    onAddOrRemoveFilter: PropTypes.func,
  };

  constructor(props) {
    super(props);

    // Source filters do not have any unique ids, only the value is stored.
    // To ensure we can create a consistent and expected UX when managing
    // source filters, we are assigning a unique id to each filter on the
    // client side only
    this.clientSideId = 0;

    this.state = {
      filterToDelete: undefined,
      isDeleteConfirmationModalVisible: false,
      isSaving: false,
      filters: [],
    };
  }

  componentWillMount() {
    this.updateFilters();
  }

  updateFilters = () => {
    const sourceFilters = this.props.indexPattern.sourceFilters || [];
    const filters = sourceFilters.map(filter => ({
      ...filter,
      clientId: ++this.clientSideId,
    }));

    this.setState({ filters });
  };

  getFilteredFilters = createSelector(
    state => state.filters,
    (state, props) => props.filterFilter,
    (filters, filterFilter) => {
      if (filterFilter) {
        const filterFilterToLowercase = filterFilter.toLowerCase();
        return filters.filter(filter =>
          filter.value.toLowerCase().includes(filterFilterToLowercase)
        );
      }

      return filters;
    }
  );

  startDeleteFilter = filter => {
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

    indexPattern.sourceFilters = filters.filter(filter => {
      return filter.clientId !== filterToDelete.clientId;
    });

    this.setState({ isSaving: true });
    await indexPattern.save();
    onAddOrRemoveFilter && onAddOrRemoveFilter();
    this.updateFilters();
    this.setState({ isSaving: false });
    this.hideDeleteConfirmationModal();
  };

  onAddFilter = async value => {
    const { indexPattern, onAddOrRemoveFilter } = this.props;

    indexPattern.sourceFilters = [
      ...(indexPattern.sourceFilters || []),
      { value },
    ];

    this.setState({ isSaving: true });
    await indexPattern.save();
    onAddOrRemoveFilter && onAddOrRemoveFilter();
    this.updateFilters();
    this.setState({ isSaving: false });
  };

  saveFilter = async ({ filterId, newFilterValue }) => {
    const { indexPattern } = this.props;
    const { filters } = this.state;

    indexPattern.sourceFilters = filters.map(filter => {
      if (filter.clientId === filterId) {
        return {
          value: newFilterValue,
          clientId: filter.clientId,
        };
      }
      return filter;
    });

    this.setState({ isSaving: true });
    await indexPattern.save();
    this.updateFilters();
    this.setState({ isSaving: false });
  };

  renderDeleteConfirmationModal() {
    const { filterToDelete } = this.state;

    if (!filterToDelete) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={<FormattedMessage
            id="kbn.management.editIndexPattern.source.deleteSourceFilterLabel"
            defaultMessage="Delete source filter '{value}'?"
            values={{
              value: filterToDelete.value,
            }}
          />}
          onCancel={this.hideDeleteConfirmationModal}
          onConfirm={this.deleteFilter}
          cancelButtonText={<FormattedMessage
            id="kbn.management.editIndexPattern.source.deleteFilter.cancelButtonLabel"
            defaultMessage="Cancel"
          />}
          confirmButtonText={<FormattedMessage
            id="kbn.management.editIndexPattern.source.deleteFilter.deleteButtonLabel"
            defaultMessage="Delete"
          />}
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        />
      </EuiOverlayMask>
    );
  }

  render() {
    const { indexPattern, fieldWildcardMatcher } = this.props;

    const { isSaving } = this.state;

    const filteredFilters = this.getFilteredFilters(this.state, this.props);

    return (
      <div>
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

        {this.renderDeleteConfirmationModal()}
      </div>
    );
  }
}
