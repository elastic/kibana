import React from 'react';

import { LandingPageTable } from 'ui/saved_object_table/landing_page_table';
import { getVisualizeColumns } from './get_visualize_columns';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { VisualizeConstants } from '../visualize_constants';
import { VisualizeItemPrompt } from './visualize_item_prompt';

import {
  DeleteButton,
  CreateButtonLink
} from 'ui_framework/components';

// TODO: Get rid of this class and just embed this directly in visualize_listing.js/html??

function getActionButtons(onDeleteItems, tableActions) {
  return tableActions.getState().getSelectedItemsCount() > 0
    ? <DeleteButton onClick={onDeleteItems} />
    : <CreateButtonLink href={'#' + VisualizeConstants.WIZARD_STEP_1_PAGE_PATH} />;
}

export function VisualizeLandingPageTable({ tableActions, onDeleteItems, kbnUrl }) {
  const columns = getVisualizeColumns(tableActions, kbnUrl);

  return <LandingPageTable
    prompt={ <VisualizeItemPrompt /> }
    actionButtons={getActionButtons(onDeleteItems, tableActions)}
    columns={columns}
    tableActions={tableActions}
  >
  </LandingPageTable>;
}

VisualizeLandingPageTable.propTypes = {
  tableActions: React.PropTypes.any.isRequired,
  onDeleteItems: React.PropTypes.func.isRequired,
  kbnUrl: React.PropTypes.any.isRequired
};
