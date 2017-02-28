import React from 'react';

import { VisualizeConstants } from '../visualize_constants';
import { VisualizeItemPrompt } from './visualize_item_prompt';

import { ItemSelectionActions } from 'ui/saved_object_table/item_selection_actions';
import { sortItems, getFlippedSortOrder } from 'ui/saved_object_table/sort_items';
import { TITLE_COLUMN_ID } from 'ui/saved_object_table/get_title_column';
import { getCheckBoxColumn } from 'ui/saved_object_table/get_checkbox_column';
import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { TYPE_COLUMN_ID, getTypeColumn } from './get_type_column';
import { Pager } from 'ui/pager/pager';

import {
  ItemTable,
  DeleteButton,
  CreateButtonLink,
  SortOrder,
  LandingPageToolBar,
  LandingPageToolBarFooter
} from 'ui_framework/components';

export class VisualizeLandingPageTable extends React.Component {
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
      const lastPageIndex = this.pager.getLastPageIndex(items.length);

      this.setState({
        items,
        isFetchingItems: false,
        currentPageIndex: Math.min(this.state.currentPageIndex, lastPageIndex),
        selectedIds: [],
      });
    });
  };

  onSort = (property) => {
    let { sortedColumn, sortOrder } = this.state;
    const { selectedIds, items } = this.state;

    if (sortedColumn === property) {
      sortOrder = getFlippedSortOrder(sortOrder);
    } else {
      sortedColumn = property;
      sortOrder = SortOrder.ASC;
    }

    const sortedItems = sortItems(items, sortedColumn, sortOrder);
    this.setState({
      sortedColumn,
      sortOrder,
      selectedIds: [],
      items: sortedItems
    });
  };

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

  onSortByTitle = () => {
    this.onSort(TITLE_COLUMN_ID);
  };

  onSortByType = () => {
    this.onSort(TYPE_COLUMN_ID);
  };

  onToggleItem = (item) => {
    this.setState({
      selectedIds: ItemSelectionActions.toggleItem(this.state.selectedIds, item.id),
    });
  };

  onToggleAll = () => {
    const pageOfItems = this.getPageOfItems();
    const pageOfItemIds = pageOfItems.map(item => item.id);
    this.setState({
      selectedIds: ItemSelectionActions.toggleAll(this.state.selectedIds, pageOfItemIds),
    });
  };

  getStartNumber = () => this.pager.getStartNumber(this.state.items.length, this.state.currentPageIndex);
  getEndNumber = () => this.pager.getEndNumber(this.state.items.length, this.state.currentPageIndex);
  getPageOfItems = () => this.pager.getItemsOnPage(this.state.items, this.state.currentPageIndex);
  hasPreviousPage = () => this.pager.canPagePrevious(this.state.currentPageIndex);
  hasNextPage = () => this.pager.canPageNext(this.state.items.length, this.state.currentPageIndex);

  getEditUrlForItem = (item) => {
    return this.props.kbnUrl.eval(`#${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: item.id });
  };

  getColumnSortOrder(column) {
    return this.state.sortedColumn === column ? this.state.sortOrder : SortOrder.NONE;
  }

  getTitleSortOrder() {
    return this.getColumnSortOrder(TITLE_COLUMN_ID);
  }

  getTypeSortOrder() {
    return this.getColumnSortOrder(TYPE_COLUMN_ID);
  }

  getAreAllItemsSelected() {
    const { selectedIds } = this.state;
    const pageOfItems = this.getPageOfItems();
    const pageOfItemIds = pageOfItems.map(item => item.id);
    return ItemSelectionActions.areAllItemsSelected(selectedIds, pageOfItemIds);
  }

  getVisualizeColumns() {
    const { selectedIds } = this.state;
    return [
      getCheckBoxColumn(this.getAreAllItemsSelected(), selectedIds, this.onToggleItem, this.onToggleAll),
      getTitleColumn(this.getEditUrlForItem, this.getTitleSortOrder(), this.onSortByTitle),
      getTypeColumn(this.onSortByType, this.getTypeSortOrder()),
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
      : <CreateButtonLink href={'#' + VisualizeConstants.WIZARD_STEP_1_PAGE_PATH} />;
  }

  getTableContents() {
    const { isFetchingItems } = this.state;
    if (isFetchingItems) return null;
    const pageOfItems = this.getPageOfItems();
    const columns = this.getVisualizeColumns();

    return pageOfItems.length > 0
      ? <ItemTable items={pageOfItems} columns={columns}/>
      : <VisualizeItemPrompt />;
  }

  render() {
    const { filter, pager, selectedIds } = this.state;

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

VisualizeLandingPageTable.propTypes = {
  fetch: React.PropTypes.func.isRequired,
  deleteItems: React.PropTypes.func.isRequired,
  kbnUrl: React.PropTypes.any.isRequired
};
