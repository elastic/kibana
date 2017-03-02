import React from 'react';

import { VisualizeConstants } from '../visualize_constants';
import { VisualizeItemPrompt } from './visualize_item_prompt';

import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { CrudItemTable } from 'ui/saved_object_table/crud_item_table';
import { getTypeColumn } from './get_type_column';

export function VisualizeLandingPageTable(props) {
  const getEditUrlForItem = (item) => {
    return props.kbnUrl.eval(`#${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: item.id });
  };

  const columns = [
    getTitleColumn(getEditUrlForItem),
    getTypeColumn(),
  ];

  const extendedProps = Object.assign({}, props, {
    addHref: '#' + VisualizeConstants.WIZARD_STEP_1_PAGE_PATH,
    itemPrompt: <VisualizeItemPrompt />,
    columns
  });

  return <CrudItemTable {...extendedProps} />;
}

VisualizeLandingPageTable.propTypes = {
  fetch: React.PropTypes.func.isRequired,
  deleteItems: React.PropTypes.func.isRequired,
  kbnUrl: React.PropTypes.any.isRequired
};
