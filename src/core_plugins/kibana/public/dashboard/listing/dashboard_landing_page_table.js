import React from 'react';

import { DashboardConstants } from '../dashboard_constants';
import { DashboardItemPrompt } from './dashboard_item_prompt';
import { SelectedIds } from 'ui/saved_object_table/selected_ids';
import { Pager, ToolBarPager } from 'ui/pager';
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
  KuiToolBarSearchBox,
  KuiToolBarPager,
  KuiToolBar,
  KuiToolBarFooter,
  KuiToolBarText
} from 'ui_framework/components';

const ITEMS_PER_PAGE = 2;

export class DashboardLandingPageTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = ListingTableActions.getInitialState();
    this.pager = new Pager(ITEMS_PER_PAGE);
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

  getPagerComponent() {
    return <ToolBarPager
      currentPageIndex={this.state.currentPageIndex}
      totalItems={this.state.items.length}
      itemsPerPage={ITEMS_PER_PAGE}
      onNextPage={this.turnToNextPage}
      onPreviousPage={this.turnToPreviousPage}/>;
  }

  getToolBarSections() {
    const toolBarSections = [
      <KuiToolBarSearchBox filter={this.state.filter} onFilter={this.onFilter}/>,
      this.getActionButtons()
    ];
    if (this.state.items.length > 0) {
      toolBarSections.push(this.getPagerComponent());
    }
    return toolBarSections;
  }

  getToolBarFooterSections() {
    const footerSections = [
      <KuiToolBarText>{this.state.selectedIds.length} selected</KuiToolBarText>,
    ];
    if (this.state.items.length > 0) {
      footerSections.push(this.getPagerComponent());
    }
    return footerSections;
  }

  render() {
    return <div>
      <KuiToolBar sections={this.getToolBarSections()} />
      {
        this.getTableContents()
      }
      <KuiToolBarFooter sections={this.getToolBarFooterSections()} />
    </div>;
  }
}

DashboardLandingPageTable.propTypes = {
  fetch: React.PropTypes.func.isRequired,
  deleteItems: React.PropTypes.func.isRequired,
  kbnUrl: React.PropTypes.any.isRequired
};
