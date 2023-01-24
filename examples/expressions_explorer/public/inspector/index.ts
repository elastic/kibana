/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Adapters, InspectorViewDescription } from '@kbn/inspector-plugin/public';
import { getExpressionsInspectorViewComponentWrapper } from './expressions_inspector_view_wrapper';

export const getExpressionsInspectorViewDescription = (): InspectorViewDescription => ({
  title: i18n.translate('data.inspector.table.dataTitle', {
    defaultMessage: 'Expression',
  }),
  order: 100,
  help: i18n.translate('data.inspector.table..dataDescriptionTooltip', {
    defaultMessage: 'View the expression behind the visualization',
  }),
  shouldShow(adapters: Adapters) {
    return Boolean(adapters.expression);
  },
  component: getExpressionsInspectorViewComponentWrapper(),
});
