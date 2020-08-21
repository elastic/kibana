/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  const shouldNotApplyFilter = [PANEL_TYPES.GAUGE, PANEL_TYPES.MARKDOWN].includes(panel.type);

  return visibleSeries.filter((series) => !series.hidden || shouldNotApplyFilter);
};
