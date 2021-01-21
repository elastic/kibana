/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DocLinksStart, CoreSetup } from 'src/core/public';
import { VisualizationsSetup } from '../../visualizations/public';
import { getMapsAliasConfig } from './vis_type_alias';

export interface MapsPluginSetupDependencies {
  visualizations: VisualizationsSetup;
}

export interface MapsPluginStartDependencies {
  docLinks: DocLinksStart;
}

export class MapsOSSPlugin {
  setup(
    core: CoreSetup<MapsPluginStartDependencies>,
    { visualizations }: MapsPluginSetupDependencies
  ) {
    core.getStartServices().then(([coreStart]) => {
      visualizations.registerAlias(getMapsAliasConfig(coreStart.docLinks));
    });
  }

  start() {}
}
