import React from 'react';

import { LandingPageTable } from 'ui_framework/components';
import { getVisualizeColumns } from './get_visualize_columns';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { VisualizeConstants } from '../visualize_constants';

export function VisualizeLandingPageTable({ itemTableState, onDeleteItems, onFilterItems, isFetchingItems }) {
  const columns = getVisualizeColumns(itemTableState);

  return <LandingPageTable
    typeName={VisualizeConstants.SAVED_VIS_TYPE}
    typeNamePlural={VisualizeConstants.SAVED_VIS_TYPE_PLURAL}
    addHref={'#' + VisualizeConstants.WIZARD_STEP_1_PAGE_PATH}
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

VisualizeLandingPageTable.propTypes = {
  itemTableState: React.PropTypes.any.isRequired,
  onDeleteItems: React.PropTypes.func.isRequired,
  onFilterItems: React.PropTypes.func.isRequired,
  isFetchingItems: React.PropTypes.bool.isRequired
};
