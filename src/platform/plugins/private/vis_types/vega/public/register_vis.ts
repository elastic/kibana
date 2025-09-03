/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import type { VegaPluginSetupDependencies, VegaVisualizationDependencies } from './plugin';
import { getServiceSettingsLazy } from './vega_view/vega_map_view/service_settings/get_service_settings_lazy';
import { createVegaFn } from './vega_fn';
import { getVegaVisRenderer } from './vega_vis_renderer';

export const registerVegaVis = async (
  core: CoreSetup,
  { data, expressions, inspector, visualizations }: VegaPluginSetupDependencies
) => {
  const visualizationDependencies: Readonly<VegaVisualizationDependencies> = {
    core,
    plugins: {
      data,
    },
    getServiceSettings: getServiceSettingsLazy,
  };
  const [{ getVegaInspectorView }, { vegaVisType }] = await Promise.all([
    import('./vega_inspector'),
    import('./vega_type'),
  ]);
  inspector.registerView(getVegaInspectorView({ uiSettings: core.uiSettings }));

  expressions.registerFunction(() => createVegaFn(visualizationDependencies));
  expressions.registerRenderer(getVegaVisRenderer(visualizationDependencies));

  visualizations.createBaseVisualization(vegaVisType);
};
