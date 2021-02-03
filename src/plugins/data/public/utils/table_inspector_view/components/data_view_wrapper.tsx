/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import { IUiSettingsClient } from 'kibana/public';
import { UiActionsStart } from '../../../../../ui_actions/public';
import { FieldFormatsStart } from '../../../field_formats';
import { DatatableColumn } from '../../../../../expressions/common/expression_types/specs';

const DataViewComponent = lazy(() => import('./data_view'));

export const getDataViewComponentWrapper = (
  getStartServices: () => {
    uiActions: UiActionsStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
    isFilterable: (column: DatatableColumn) => boolean;
  }
) => {
  return (props: any) => {
    return (
      <DataViewComponent
        adapters={props.adapters}
        title={props.title}
        uiSettings={getStartServices().uiSettings}
        fieldFormats={getStartServices().fieldFormats}
        uiActions={getStartServices().uiActions}
        isFilterable={getStartServices().isFilterable}
        options={props.options}
      />
    );
  };
};
