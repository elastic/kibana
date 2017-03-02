import React from 'react';

import { DashboardConstants } from '../dashboard_constants';
import { DashboardItemPrompt } from './dashboard_item_prompt';

import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { CrudItemTable } from 'ui/saved_object_table/crud_item_table';

export function DashboardLandingPageTable(props) {
  const getEditUrlForItem = (item) => {
    return props.kbnUrl.eval(`#${DashboardConstants.EDIT_PATH}/{{id}}`, { id: item.id });
  };

  const columns = [
    getTitleColumn(getEditUrlForItem)
  ];

  const extendedProps = Object.assign({}, props, {
    addHref: '#' + DashboardConstants.CREATE_NEW_DASHBOARD_URL,
    itemPrompt: <DashboardItemPrompt />,
    columns
  });

  return <CrudItemTable {...extendedProps} />;
}

DashboardLandingPageTable.propTypes = {
  fetch: React.PropTypes.func.isRequired,
  deleteItems: React.PropTypes.func.isRequired,
  kbnUrl: React.PropTypes.any.isRequired
};
