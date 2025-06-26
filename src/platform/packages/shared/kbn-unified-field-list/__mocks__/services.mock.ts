/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedFieldListSidebarContainerProps } from '../src/containers/unified_field_list_sidebar';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { calculateBounds } from '@kbn/data-plugin/common';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { indexPatternFieldEditorPluginMock as dataViewFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';

export const getServicesMock = (): UnifiedFieldListSidebarContainerProps['services'] => {
  const mockedServices: UnifiedFieldListSidebarContainerProps['services'] = {
    data: dataPluginMock.createStartContract(),
    dataViews: dataViewPluginMocks.createStartContract(),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    charts: chartPluginMock.createSetupContract(),
    core: coreMock.createStart(),
    uiActions: uiActionsPluginMock.createStartContract(),
    dataViewFieldEditor: dataViewFieldEditorPluginMock.createStartContract(),
  };

  mockedServices.data.query.timefilter.timefilter.getTime = jest.fn(() => {
    return { from: 'now-15m', to: 'now' };
  });

  mockedServices.data.query.timefilter.timefilter.calculateBounds = jest.fn(calculateBounds);

  mockedServices.data.query.getState = jest.fn(() => ({
    query: { query: '', language: 'lucene' },
    filters: [],
  }));

  return mockedServices;
};
