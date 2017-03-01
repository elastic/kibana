import React from 'react';

import { DashboardConstants } from '../dashboard_constants';
import { DashboardItemPrompt } from './dashboard_item_prompt';
import { SelectedIds } from 'ui/saved_object_table/selected_ids';
import { Pager } from 'ui/pager/pager';
import { sortItems, getFlippedSortOrder } from 'ui/saved_object_table/sort_items';
import { TITLE_COLUMN_ID } from 'ui/saved_object_table/get_title_column';
import { getCheckBoxColumn } from 'ui/saved_object_table/get_checkbox_column';
import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { ListingTableActions } from 'ui/saved_object_table/listing_table_actions';

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

    this.state = ListingTableActions.getInitialState();
    this.pager = new Pager(2);
  }

  componentDidMount() {
    this.onFilter();
  }

  onFilter = (newFilter) => {
    this.setState(ListingTableActions.startFetching());
    this.props.fetch(newFilter).then((results) => {
      const items = results.hits;
      const lastPageIndex = this.pager.getLastPageIndex(items.length);
      this.setState(ListingTableActions.setFilteredItems(this.state, items, lastPageIndex));
    }).finally(() => {
      this.setState(ListingTableActions.endFetching());
    });
  };

  getPageOfItems = () => this.pager.getItemsOnPage(this.state.items, this.state.currentPageIndex);

  onToggleAll = () => this.setState(ListingTableActions.onToggleAll(this.state, this.getPageOfItems()));

  onToggleItem = (item) => this.setState(ListingTableActions.onToggleItem(this.state, item));

  turnToNextPage = () => this.setState(ListingTableActions.turnToNextPage(this.state));

  turnToPreviousPage = () => this.setState(ListingTableActions.turnToPreviousPage(this.state));

  onSortByTitle = () => this.setState(ListingTableActions.onSort(this.state, TITLE_COLUMN_ID));

  getStartNumber = () => this.pager.getStartNumber(this.state.items.length, this.state.currentPageIndex);

  getEndNumber = () => this.pager.getEndNumber(this.state.items.length, this.state.currentPageIndex);

  hasPreviousPage = () => this.pager.canPagePrevious(this.state.currentPageIndex);

  hasNextPage = () => this.pager.canPageNext(this.state.items.length, this.state.currentPageIndex);

  getEditUrlForItem = (item) => {
    return this.props.kbnUrl.eval(`#${DashboardConstants.EDIT_PATH}/{{id}}`, { id: item.id });
  };

  getColumnSortOrder = (column) => ListingTableActions.getSortOrderForColumn(this.state, column);

  getTitleSortOrder = () => this.getColumnSortOrder(TITLE_COLUMN_ID);

  getAreAllItemsSelected = () => ListingTableActions.areAllItemsSelected(this.state, this.getPageOfItems());

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
