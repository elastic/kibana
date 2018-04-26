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
          title={`Delete source filter '${filterToDelete.value}'?`}
          onCancel={this.hideDeleteConfirmationModal}
          onConfirm={this.deleteFilter}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
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
