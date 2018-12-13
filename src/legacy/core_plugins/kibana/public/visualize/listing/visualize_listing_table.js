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
import _ from 'lodash';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import { Pager } from 'ui/pager';
import { NoVisualizationsPrompt } from './no_visualizations_prompt';

import {
  KuiPager,
  KuiListingTableDeleteButton,
  KuiListingTableCreateButton,
  KuiListingTable,
  KuiListingTableNoMatchesPrompt,
  KuiListingTableLoadingPrompt
} from '@kbn/ui-framework/components';

import {
  EuiOverlayMask,
  EuiConfirmModal,
  SortableProperties,
  EuiIcon,
} from '@elastic/eui';

class VisualizeListingTableUi extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedRowIds: [],
      pageOfItems: [],
      showDeleteModal: false,
      filter: '',
      sortedColumn: 'title',
      pageStartNumber: 1,
      isFetchingItems: false,
    };

    this.sortableProperties = new SortableProperties(
      [
        {
          name: 'title',
          getValue: item => item.title.toLowerCase(),
          isAscending: true,
        },
        {
          name: 'type',
          getValue: item => item.type.title.toLowerCase(),
          isAscending: true,
        }
      ],
      this.state.sortedColumn
    );
    this.items = [];
    this.pager = new Pager(this.items.length, 20, 1);

    this.debouncedFetch = _.debounce(filter => {
      this.props.fetchItems(filter)
        .then(items => {
          // We need this check to handle the case where search results come back in a different
          // order than they were sent out. Only load results for the most recent search.
          if (filter === this.state.filter) {
            this.setState({
              isFetchingItems: false,
              selectedRowIds: [],
            });
            this.items = items;
            this.calculateItemsOnPage();
          }
        });
    }, 300);
  }

  componentWillUnmount() {
    this.debouncedFetch.cancel();
  }

  calculateItemsOnPage = () => {
    this.items = this.sortableProperties.sortItems(this.items);
    this.pager.setTotalItems(this.items.length);
    const pageOfItems = this.items.slice(this.pager.startIndex, this.pager.startIndex + this.pager.pageSize);
    this.setState({ pageOfItems, pageStartNumber: this.pager.startItem });
  };

  deselectAll = () => {
    this.setState({ selectedRowIds: [] });
  };

  isAscending = (name) => this.sortableProperties.isAscendingByName(name);
  getSortedProperty = () => this.sortableProperties.getSortedProperty();

  sortOn = function sortOn(propertyName) {
    this.sortableProperties.sortOn(propertyName);
    this.setState({
      selectedRowIds: [],
      sortedColumn: this.sortableProperties.getSortedProperty().name,
    });
    this.calculateItemsOnPage();
  };

  fetchItems = (filter) => {
    this.setState({ isFetchingItems: true, filter });
    this.debouncedFetch(filter);
  };

  componentDidMount() {
    this.fetchItems(this.state.filter);
  }

  onNextPage = () => {
    this.deselectAll();
    this.pager.nextPage();
    this.calculateItemsOnPage();
  };

  onPreviousPage = () => {
    this.deselectAll();
    this.pager.previousPage();
    this.calculateItemsOnPage();
  };

  getUrlForItem(item) {
    return `#/visualize/edit/${item.id}`;
  }

  renderItemTypeIcon(item) {
    let icon;
    if (item.type.image) {
      icon = (
        <img
          className="visListingTable__typeImage"
          aria-hidden="true"
          alt=""
          src={item.type.image}
        />
      );
    } else if (!item.type.image && !item.type.icon) {
      icon = (
        // Allowing legacyIcon to hold a CSS name, will be removed in 7.0
        <span
          aria-hidden="true"
          className={`kuiStatusText__icon kuiIcon ${item.type.legacyIcon}`}
        />
      );
    } else {
      icon = (
        <EuiIcon
          className="visListingTable__typeIcon"
          aria-hidden="true"
          type={item.icon}
          size="m"
        />
      );
    }

    return icon;
  }

  sortByTitle = () => this.sortOn('title');
  sortByType = () => this.sortOn('type');

  renderHeader() {
    return [
      {
        content: 'Title',
        onSort: this.sortByTitle,
        isSorted: this.state.sortedColumn === 'title',
        isSortAscending: this.sortableProperties.isAscendingByName('title'),
      },
      {
        content: 'Type',
        onSort: this.sortByType,
        isSorted: this.state.sortedColumn === 'type',
        isSortAscending: this.sortableProperties.isAscendingByName('type'),
      },
    ];
  }

  renderRowCells(item) {

    let flaskHolder;
    if (item.type.shouldMarkAsExperimentalInUI()) {
      flaskHolder = <span className="kuiIcon fa-flask ng-scope">&nbsp;</span>;
    }else{
      flaskHolder = <span />;
    }

    return [
      <span>
        {flaskHolder}
        <a className="kuiLink" href={this.getUrlForItem(item)}>
          {item.title}
        </a>
      </span>,
      <span className="kuiStatusText">
        {this.renderItemTypeIcon(item)}
        {item.type.title}
      </span>
    ];
  }

  createRows() {
    return this.state.pageOfItems.map(item => ({
      id: item.id,
      cells: this.renderRowCells(item)
    }));
  }

  closeModal = () => {
    this.setState({ showDeleteModal: false });
  };

  renderConfirmDeleteModal() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={this.props.intl.formatMessage({
            id: 'kbn.visualize.listing.deleteVisualizations.confirmModalTitle',
            defaultMessage: 'Delete selected visualizations?',
          })}
          onCancel={this.closeModal}
          onConfirm={this.deleteSelectedItems}
          cancelButtonText={this.props.intl.formatMessage({
            id: 'kbn.visualize.listing.deleteVisualizations.confirmModalCancelButtonText',
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={this.props.intl.formatMessage({
            id: 'kbn.visualize.listing.deleteVisualizations.confirmModalConfirmButtonText',
            defaultMessage: 'Delete',
          })}
        >
          <p>
            <FormattedMessage
              id="kbn.visualize.listing.deleteVisualizations.confirmModalText"
              defaultMessage="You can't recover deleted visualizations."
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  onDelete = () => {
    this.setState({ showDeleteModal: true });
  };

  deleteSelectedItems = () => {
    this.props.deleteSelectedItems(this.state.selectedRowIds)
      .then(() => this.fetchItems(this.state.filter))
      .catch(() => {})
      .then(() => this.deselectAll())
      .then(() => this.closeModal());
  };

  onItemSelectionChanged = (newSelectedIds) => {
    this.setState({ selectedRowIds: newSelectedIds });
  };

  onCreate = () => {
    this.props.onCreateVis();
  }

  renderToolBarActions() {
    return this.state.selectedRowIds.length > 0 ?
      <KuiListingTableDeleteButton
        onDelete={this.onDelete}
        aria-label={this.props.intl.formatMessage({
          id: 'kbn.visualize.listing.deleteVisualizationsButtonAriaLabel',
          defaultMessage: 'Delete selected visualizations',
        })}
      /> :
      <KuiListingTableCreateButton
        onCreate={this.onCreate}
        data-test-subj="createNewVis"
        aria-label={this.props.intl.formatMessage({
          id: 'kbn.visualize.listing.createVisualizationButtonAriaLabel',
          defaultMessage: 'Create new visualization',
        })}
      />;
  }

  renderPager() {
    return (
      <KuiPager
        startNumber={this.state.pageStartNumber}
        hasNextPage={this.pager.hasNextPage}
        hasPreviousPage={this.pager.hasPreviousPage}
        endNumber={this.pager.endItem}
        totalItems={this.items.length}
        onNextPage={this.onNextPage}
        onPreviousPage={this.onPreviousPage}
      />
    );
  }

  renderPrompt() {
    if (this.state.isFetchingItems) {
      return <KuiListingTableLoadingPrompt />;
    }

    if (this.items.length === 0) {
      if (this.state.filter) {
        return <KuiListingTableNoMatchesPrompt />;
      }

      return <NoVisualizationsPrompt onCreateVis={this.onCreate}/>;
    }

    return null;
  }

  render() {
    return (
      <div>
        {this.state.showDeleteModal && this.renderConfirmDeleteModal()}
        <KuiListingTable
          pager={this.renderPager()}
          toolBarActions={this.renderToolBarActions()}
          selectedRowIds={this.state.selectedRowIds}
          rows={this.createRows()}
          header={this.renderHeader()}
          onFilter={this.fetchItems}
          filter={this.state.filter}
          prompt={this.renderPrompt()}
          onItemSelectionChanged={this.onItemSelectionChanged}
        />
      </div>
    );
  }
}

VisualizeListingTableUi.propTypes = {
  deleteSelectedItems: PropTypes.func,
  fetchItems: PropTypes.func,
  onCreateVis: PropTypes.func.isRequired,
};

export const VisualizeListingTable = injectI18n(VisualizeListingTableUi);
