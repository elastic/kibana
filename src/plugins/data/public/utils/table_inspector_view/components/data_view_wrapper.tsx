/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { IUiSettingsClient } from '@kbn/core/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DatatableColumn } from '@kbn/expressions-plugin/common/expression_types/specs';

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
