/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// these are not typed yet
// @ts-expect-error
import { TimeseriesPanelConfig as timeseries } from './panel_config/timeseries';
// @ts-expect-error
import { MetricPanelConfig as metric } from './panel_config/metric';
// @ts-expect-error
import { TopNPanelConfig as topN } from './panel_config/top_n';
// @ts-expect-error
import { TablePanelConfig as table } from './panel_config/table';
// @ts-expect-error
import { GaugePanelConfig as gauge } from './panel_config/gauge';
// @ts-expect-error
import { MarkdownPanelConfig as markdown } from './panel_config/markdown';

export const panelConfigTypes = {
  timeseries,
  table,
  metric,
  top_n: topN,
  gauge,
  markdown,
};
