import React from 'react';

import { LandingPageTable } from 'ui_framework/components';
import { getDashboardColumns } from './get_dashboard_columns';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { DashboardConstants } from '../dashboard_constants';

export function DashboardLandingPageTable({ itemTableState, deleteItems, filterItems }) {
  const columns = getDashboardColumns(itemTableState);

  return <LandingPageTable
    typeName={DashboardConstants.TYPE_NAME}
    typeNamePlural={DashboardConstants.TYPE_NAME_PLURAL}
    addHref={'#' + DashboardConstants.CREATE_NEW_DASHBOARD_URL}
    items={itemTableState.pageOfItems}
    deleteItems={(items) => deleteItems(items)}
    filterItems={(filter) => filterItems(filter)}
    pagerState={itemTableState.pager}
    onNextPage={() => ItemTableActions.onPageNext(itemTableState)}
    onPreviousPage={() => ItemTableActions.onPagePrevious(itemTableState)}
    columns={columns}
    selectedItemsCount={itemTableState.getSelectedItemsCount()}>
  </LandingPageTable>;
}

DashboardLandingPageTable.propTypes = {
  itemTableState: React.PropTypes.any.isRequired,
  deleteItems: React.PropTypes.func.isRequired,
  filterItems: React.PropTypes.func.isRequired
};
