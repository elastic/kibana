import React from 'react';

import { DashboardConstants } from '../dashboard_constants';
import { DashboardItemPrompt } from './dashboard_item_prompt';
import { SelectedIds } from 'ui/saved_object_table/selected_ids';
import { Pager } from 'ui/pager/pager';
import { sortItems, getFlippedSortOrder } from 'ui/saved_object_table/sort_items';
import { TITLE_COLUMN_ID } from 'ui/saved_object_table/get_title_column';
import { getCheckBoxColumn } from 'ui/saved_object_table/get_checkbox_column';
import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { ItemSelectionActions } from 'ui/saved_object_table/item_selection_actions';

import {
  ItemTable,
  DeleteButton,
  CreateButtonLink,
  SortOrder,
  LandingPageToolBar,
  LandingPageToolBarFooter
} from 'ui_framework/components';

export class DashboardLandingPageTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isFetchingItems: true,
      items: [],
      sortedColumn: undefined,
      sortOrder: SortOrder.ASC,
      selectedIds: [],
      currentPageIndex: 0,
    };

    this.pager = new Pager(2);
  }

  componentDidMount() {
    this.onFilter();
  }

  onFilter = (newFilter) => {
    this.props.fetch(newFilter).then((results) => {
      const items = results.hits;
      const lastPageIndex = this.pager.getLastPageIndex(this.getPageOfItems().length);

      this.setState({
        items,
        isFetchingItems: false,
        currentPageIndex: Math.min(this.state.currentPageIndex, lastPageIndex),
        selectedIds: [],
        filter: newFilter
      });
    });
  };

  onSort(property) {
    let { sortedColumn, sortOrder } = this.state;
    const { selectedIds, items } = this.state;

    if (sortedColumn === property) {
      sortOrder = getFlippedSortOrder(sortOrder);
    } else {
      sortedColumn = property;
      sortOrder = SortOrder.ASC;
    }

    const sortedItems = sortItems(items, sortedColumn, sortOrder);
    ItemSelectionActions.deselectAll(selectedIds);
    this.setState({
      sortedColumn,
      sortOrder,
      selectedIds,
      items: sortedItems
    });
  }

  turnToNextPage = () => {
    this.setState({
      currentPageIndex: this.state.currentPageIndex + 1,
      selectedIds: [],
    });
  };

  turnToPreviousPage = () => {
    this.setState({
      currentPageIndex: this.state.currentPageIndex - 1,
      selectedIds: [],
    });
  };

  getStartNumber = () => this.pager.getStartNumber(this.state.items.length, this.state.currentPageIndex);
  getEndNumber = () => this.pager.getEndNumber(this.state.items.length, this.state.currentPageIndex);
  getPageOfItems = () => this.pager.getItemsOnPage(this.state.items, this.state.currentPageIndex);
  hasPreviousPage = () => this.pager.canPagePrevious(this.state.currentPageIndex);
  hasNextPage = () => this.pager.canPageNext(this.state.items.length, this.state.currentPageIndex);
  getPagesCount = () => this.pager.getPagesCount(this.getPageOfItems().length);

  onSortByTitle = () => {
    this.onSort(TITLE_COLUMN_ID);
  };

  onToggleItem = (item) => {
    const selectedIds = ItemSelectionActions.toggleItem(this.state.selectedIds, item.id);
    this.setState({ selectedIds });
  };

  onToggleAll = () => {
    const pageOfItems = this.getPageOfItems();
    const selectedIds = ItemSelectionActions.toggleAll(this.state.selectedIds, pageOfItems);
    this.setState({ selectedIds });
  };

  getEditUrlForItem = (item) => {
    return this.props.kbnUrl.eval(`#${DashboardConstants.EDIT_PATH}/{{id}}`, { id: item.id });
  };

  getColumnSortOrder(column) {
    return this.state.sortedColumn === column ? this.state.sortOrder : SortOrder.NONE;
  }

  getTitleSortOrder() {
    return this.getColumnSortOrder(TITLE_COLUMN_ID);
  }

  getAreAllItemsSelected() {
    const { selectedIds } = this.state;
    const pageOfItems = this.getPageOfItems();
    const pageOfItemIds = pageOfItems.map(item => item.id);
    return ItemSelectionActions.areAllItemsSelected(selectedIds, pageOfItemIds);
  }

  getDashboardColumns() {
    const { selectedIds } = this.state;
    return  [
      getCheckBoxColumn(this.getAreAllItemsSelected(), selectedIds, this.onToggleItem, this.onToggleAll),
      getTitleColumn(this.getEditUrlForItem, this.getTitleSortOrder(), this.onSortByTitle)
    ];
  }

  onDelete = () => {
    const { deleteItems } = this.props;
    const { selectedIds, filter } = this.state;
    deleteItems(selectedIds).then((didDelete) => {
      if (didDelete) {
        this.onFilter(filter);
      }
    });
  };

  getActionButtons() {
    return this.state.selectedIds.length > 0
      ? <DeleteButton onClick={this.onDelete} />
      : <CreateButtonLink href={'#' + DashboardConstants.CREATE_NEW_DASHBOARD_URL} />;
  }

  getTableContents() {
    const { isFetchingItems } = this.state;
    if (isFetchingItems) return null;
    const pageOfItems = this.getPageOfItems();
    const columns = this.getDashboardColumns();

    return pageOfItems.length > 0
      ? <ItemTable items={pageOfItems} columns={columns}/>
      : <DashboardItemPrompt />;
  }

  render() {
    const { filter, selectedIds } = this.state;

    return <div>
      <LandingPageToolBar
        filter={filter}
        onFilter={this.onFilter}
        startNumber={this.getStartNumber()}
        endNumber={this.getEndNumber()}
        totalItems={this.state.items.length}
        hasPreviousPage={this.hasPreviousPage}
        hasNextPage={this.hasNextPage}
        onNextPage={this.turnToNextPage}
        onPreviousPage={this.turnToPreviousPage}
        actionButtons={this.getActionButtons()}/>
      {
        this.getTableContents()
      }
      <LandingPageToolBarFooter
        startNumber={this.getStartNumber()}
        endNumber={this.getEndNumber()}
        totalItems={this.state.items.length}
        hasPreviousPage={this.hasPreviousPage}
        hasNextPage={this.hasNextPage}
        onNextPage={this.turnToNextPage}
        onPreviousPage={this.turnToPreviousPage}
        selectedItemsCount={selectedIds.length}
      />
    </div>;
  }
}

DashboardLandingPageTable.propTypes = {
  fetch: React.PropTypes.func.isRequired,
  deleteItems: React.PropTypes.func.isRequired,
  kbnUrl: React.PropTypes.any.isRequired
};
