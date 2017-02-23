import React from 'react';

import { LandingPageTable } from 'ui/saved_object_table/landing_page_table';
import { getVisualizeColumns } from './get_visualize_columns';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { VisualizeConstants } from '../visualize_constants';

// TODO: Get rid of this class and just embed this directly in visualize_listing.js/html??

export function VisualizeLandingPageTable({ tableActions, onDeleteItems, kbnUrl }) {
  const columns = getVisualizeColumns(tableActions, kbnUrl);

  return <LandingPageTable
    typeName={VisualizeConstants.SAVED_VIS_TYPE}
    typeNamePlural={VisualizeConstants.SAVED_VIS_TYPE_PLURAL}
    addHref={'#' + VisualizeConstants.WIZARD_STEP_1_PAGE_PATH}
    onDeleteItems={onDeleteItems}
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
