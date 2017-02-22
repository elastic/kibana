import React from 'react';

import { LandingPageTable } from 'ui_framework/components';
import { getDashboardColumns } from './get_dashboard_columns';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { DashboardConstants } from '../dashboard_constants';

export function DashboardLandingPageTable({ itemTableState, onDeleteItems, onFilterItems, isFetchingItems }) {
  const columns = getDashboardColumns(itemTableState);

  return <LandingPageTable
    typeName={DashboardConstants.TYPE_NAME}
    typeNamePlural={DashboardConstants.TYPE_NAME_PLURAL}
    addHref={'#' + DashboardConstants.CREATE_NEW_DASHBOARD_URL}
    items={itemTableState.pageOfItems}
    onDeleteItems={(items) => onDeleteItems(items)}
    onFilterItems={(filter) => onFilterItems(filter)}
    pagerState={itemTableState.pager}
    onNextPage={() => ItemTableActions.turnToNextPage(itemTableState)}
    onPreviousPage={() => ItemTableActions.turnToPreviousPage(itemTableState)}
    columns={columns}
    selectedItemsCount={itemTableState.getSelectedItemsCount()}
    isFetchingItems={isFetchingItems}
  >
  </LandingPageTable>;
}

DashboardLandingPageTable.propTypes = {
  itemTableState: React.PropTypes.any.isRequired,
  onDeleteItems: React.PropTypes.func.isRequired,
  onFilterItems: React.PropTypes.func.isRequired,
  isFetchingItems: React.PropTypes.bool.isRequired
};
