import React from 'react';

import { LandingPageTable } from 'ui_framework/components';
import { getVisualizeColumns } from './get_visualize_columns';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { VisualizeConstants } from '../visualize_constants';

export function VisualizeLandingPageTable({ itemTableState, deleteItems, filterItems }) {
  const columns = getVisualizeColumns(itemTableState);

  return <LandingPageTable
    typeName={VisualizeConstants.SAVED_VIS_TYPE}
    typeNamePlural={VisualizeConstants.SAVED_VIS_TYPE_PLURAL}
    addHref={'#' + VisualizeConstants.WIZARD_STEP_1_PAGE_PATH}
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

VisualizeLandingPageTable.propTypes = {
  itemTableState: React.PropTypes.any.isRequired,
  deleteItems: React.PropTypes.func.isRequired,
  filterItems: React.PropTypes.func.isRequired
};
