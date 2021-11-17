/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'src/core/public';
import type { VisualizationsSetup } from '../../visualizations/public';
import type { ChartsPluginSetup } from '../../charts/public';
import type { FieldFormatsStart } from '../../field_formats/public';
import type { UsageCollectionSetup } from '../../usage_collection/public';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '../../home/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '../../url_forwarding/public';
import { DataPublicPluginStart, DataPublicPluginSetup, esFilters } from '../../data/public';

/** @internal */
export interface VisTypeHeatmapSetupDependencies {
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  usageCollection: UsageCollectionSetup;
  home?: HomePublicPluginSetup;
  urlForwarding: UrlForwardingSetup;
  data: DataPublicPluginSetup;
}

/** @internal */
export interface VisTypeHeatmapPluginStartDependencies {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
}

export class UnifiedSearchPlugin {
  setup(
    core: CoreSetup<VisTypeHeatmapPluginStartDependencies>,
    {
      visualizations,
      charts,
      usageCollection,
      home,
      urlForwarding,
      data,
    }: VisTypeHeatmapSetupDependencies
  ) {
    return {};
  }

  start() {}
}
