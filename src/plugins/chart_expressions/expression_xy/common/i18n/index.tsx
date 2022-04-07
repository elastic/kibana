/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const strings = {
  getMetricHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.metric', {
      defaultMessage: 'Vertical axis',
    }),
  getXAxisHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.x', {
      defaultMessage: 'Horizontal axis',
    }),
  getBreakdownHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.breakDown', {
      defaultMessage: 'Break down by',
    }),
  getReferenceLineHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.breakDown', {
      defaultMessage: 'Break down by',
    }),
};
