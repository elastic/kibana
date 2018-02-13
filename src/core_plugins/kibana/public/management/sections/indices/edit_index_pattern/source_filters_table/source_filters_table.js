import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiLoadingSpinner,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { Table } from './components/table';
import { Header } from './components/header';
import { AddFilter } from './components/add_filter';
import { getTableOfRecordsState, DEFAULT_TABLE_OF_RECORDS_STATE } from './lib';


export class SourceFiltersTable extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    filterFilter: PropTypes.string,
    fieldWildcardMatcher: PropTypes.func.isRequired,
    onAddOrRemoveFilter: PropTypes.func,
  }

  constructor(props) {
    super(props);

    this.state = {
      filterToDelete: undefined,
      isDeleteConfirmationModalVisible: false,
      isSaving: false,
      filters: [],
      ...DEFAULT_TABLE_OF_RECORDS_STATE,
    };
  }

  componentWillMount() {
    this.putFiltersInState();
  }

  putFiltersInState = () => {
    const filters = this.props.indexPattern.sourceFilters;

    this.setState({
      filters,
      ...this.computeTableState(this.state.criteria, this.props, filters)
    });
  }

  onDataCriteriaChange = criteria => {
    this.setState(this.computeTableState(criteria));
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.filterFilter !== nextProps.filterFilter) {
      this.setState(this.computeTableState(this.state.criteria, nextProps));
    }
  }

  computeTableState(criteria, props = this.props, filters = this.state.filters) {
    let items = filters;
    if (props.filterFilter) {
      const filterFilter = props.filterFilter.toLowerCase();
      items = items.filter(filter => filter.value.toLowerCase().includes(filterFilter));
    }

    return getTableOfRecordsState(items, criteria);
  }

  startDeleteFilter = filter => {
    this.setState({ filterToDelete: filter, isDeleteConfirmationModalVisible: true });
  }

  hideDeleteConfirmationModal = () => {
    this.setState({ filterToDelete: undefined, isDeleteConfirmationModalVisible: false });
  }

  deleteFilter = async () =>  {
    const { indexPattern, onAddOrRemoveFilter } = this.props;
    const { filterToDelete } = this.state;

    indexPattern.sourceFilters = indexPattern.sourceFilters.filter(filter => {
      return filter.value !== filterToDelete.value;
    });

    this.setState({ isSaving: true });
    await indexPattern.save();
    onAddOrRemoveFilter && onAddOrRemoveFilter();
    this.putFiltersInState();
    this.setState({ isSaving: false });
    this.hideDeleteConfirmationModal();
  }

  onAddFilter = async (value) => {
    const { indexPattern, onAddOrRemoveFilter } = this.props;

    indexPattern.sourceFilters = [
      ...indexPattern.sourceFilters || [],
      { value }
    ];

    this.setState({ isSaving: true });
    await indexPattern.save();
    onAddOrRemoveFilter && onAddOrRemoveFilter();
    this.putFiltersInState();
    this.setState({ isSaving: false });
  }

  saveFilter = async ({ oldFilterValue, newFilterValue }) => {
    const { indexPattern } = this.props;

    indexPattern.sourceFilters = indexPattern.sourceFilters.map(filter => {
      if (filter.value === oldFilterValue) {
        return { value: newFilterValue };
      }
      return filter;
    });

    this.setState({ isSaving: true });
    await indexPattern.save();
    this.putFiltersInState();
    this.setState({ isSaving: false });
  }

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
    const {
      indexPattern,
      fieldWildcardMatcher,
    } = this.props;

    const {
      data,
      criteria: {
        page,
        sort,
      },
      isSaving,
    } = this.state;

    const model = {
      data,
      criteria: {
        page,
        sort,
      },
    };

    return (
      <div>
        <Header/>
        <AddFilter onAddFilter={this.onAddFilter}/>
        <EuiSpacer size="l" />
        { isSaving ? <EuiLoadingSpinner/> : null }
        { data.records.length > 0 ?
          <Table
            indexPattern={indexPattern}
            model={model}
            fieldWildcardMatcher={fieldWildcardMatcher}
            deleteFilter={this.startDeleteFilter}
            saveFilter={this.saveFilter}
            onDataCriteriaChange={this.onDataCriteriaChange}
          />
          : null
        }

        {this.renderDeleteConfirmationModal()}
      </div>
    );
  }
}
