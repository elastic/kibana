/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PanelSchema } from '../../../../common/types';
import { PANEL_TYPES } from '../../../../common/panel_types';
import { limitOfSeries } from '../../../../common/ui_restrictions';

export const getActiveSeries = (panel: PanelSchema) => {
  let visibleSeries = panel.series || [];

  if (panel.type in limitOfSeries) {
    visibleSeries = visibleSeries.slice(0, limitOfSeries[panel.type]);
  }

  // Toogle visibility functionality for 'gauge', 'markdown' is not accessible
  const shouldNotApplyFilter =
    PANEL_TYPES.GAUGE === panel.type || PANEL_TYPES.MARKDOWN === panel.type;

  return visibleSeries.filter((series) => !series.hidden || shouldNotApplyFilter);
};
