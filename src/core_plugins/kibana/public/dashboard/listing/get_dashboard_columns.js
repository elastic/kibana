import React from 'react';

import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { getCheckBoxColumn } from 'ui/saved_object_table/get_checkbox_column';

export function getDashboardColumns(tableActions, kbnUrl) {
  return [
    getCheckBoxColumn(tableActions),
    getTitleColumn(tableActions, kbnUrl)
  ];
}
