import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

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
} from '@elastic/eui';

export class VisualizeListingTable extends Component {

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
    return item.type.image ?
      <img
        className="kuiStatusText__icon kuiIcon"
        aria-hidden="true"
        src={item.type.image}
      /> :
      <span
        className={`kuiStatusText__icon kuiIcon ${item.icon}`}
      />;
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
          title="Delete selected visualizations?"
          onCancel={this.closeModal}
          onConfirm={this.deleteSelectedItems}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
        >
          <p>{`You can't recover deleted visualizations.`}</p>
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

  onCreate() {
    window.location = '#/visualize/new';
  }

  renderToolBarActions() {
    return this.state.selectedRowIds.length > 0 ?
      <KuiListingTableDeleteButton onDelete={this.onDelete} aria-label="Delete selected visualizations"/> :
      <KuiListingTableCreateButton onCreate={this.onCreate} aria-label="Create new visualization"/>;
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

      return <NoVisualizationsPrompt />;
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

VisualizeListingTable.propTypes = {
  deleteSelectedItems: PropTypes.func,
  fetchItems: PropTypes.func,
};
