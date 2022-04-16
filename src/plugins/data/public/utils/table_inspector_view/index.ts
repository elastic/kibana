/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core/public';
import { Adapters, InspectorViewDescription } from '@kbn/inspector-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DatatableColumn } from '@kbn/expressions-plugin/common/expression_types/specs';
import { getDataViewComponentWrapper } from './components/data_view_wrapper';

export const getTableViewDescription = (
  getStartServices: () => {
    uiActions: UiActionsStart;
    fieldFormats: FieldFormatsStart;
    isFilterable: (column: DatatableColumn) => boolean;
    uiSettings: IUiSettingsClient;
  }
): InspectorViewDescription => ({
  title: i18n.translate('data.inspector.table.dataTitle', {
    defaultMessage: 'Data',
  }),
  order: 10,
  help: i18n.translate('data.inspector.table..dataDescriptionTooltip', {
    defaultMessage: 'View the data behind the visualization',
  }),
  shouldShow(adapters: Adapters) {
    return Boolean(adapters.tables);
  },
  component: getDataViewComponentWrapper(getStartServices),
});
