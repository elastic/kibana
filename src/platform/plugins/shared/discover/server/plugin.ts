/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type { PluginInitializerContext } from '@kbn/core/server';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { DiscoverServerPluginStart, DiscoverServerPluginStartDeps } from '.';
import { DISCOVER_APP_LOCATOR } from '../common';
import { capabilitiesProvider } from './capabilities_provider';
import { createSearchEmbeddableFactory } from './embeddable';
import { initializeLocatorServices } from './locator';
import { registerSampleData } from './sample_data';
import { getUiSettings } from './ui_settings';
import type { ConfigSchema } from './config';
import { appLocatorGetLocationCommon } from '../common/app_locator_get_location';
import {
  METRICS_EXPERIENCE_PRODUCT_FEATURE_ID,
  TRACES_PRODUCT_FEATURE_ID,
} from '../common/constants';
import { getSearchEmbeddableTransforms } from '../common/embeddable';

export class DiscoverServerPlugin
  implements Plugin<object, DiscoverServerPluginStart, object, DiscoverServerPluginStartDeps>
{
  private readonly config: ConfigSchema;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.config = initializerContext.config.get();
  }

  public setup(
    core: CoreSetup,
    plugins: {
      data: DataPluginSetup;
      embeddable: EmbeddableSetup;
      home?: HomeServerPluginSetup;
      share?: SharePluginSetup;
    }
  ) {
    core.capabilities.registerProvider(capabilitiesProvider);
    core.uiSettings.register(getUiSettings(core.docLinks, this.config.enableUiSettingsValidations));

    if (plugins.home) {
      registerSampleData(plugins.home.sampleData);
    }

    if (plugins.share) {
      plugins.share.url.locators.create({
        id: DISCOVER_APP_LOCATOR,
        getLocation: (params) => {
          return appLocatorGetLocationCommon({ useHash: false, setStateToKbnUrl }, params);
        },
      });
    }

    plugins.embeddable.registerEmbeddableFactory(createSearchEmbeddableFactory());
    plugins.embeddable.registerTransforms(SEARCH_EMBEDDABLE_TYPE, {
      getTransforms: getSearchEmbeddableTransforms,
    });

    core.pricing.registerProductFeatures([
      {
        id: TRACES_PRODUCT_FEATURE_ID,
        description: 'APM traces in Discover',
        products: [{ name: 'observability', tier: 'complete' }],
      },
      {
        id: METRICS_EXPERIENCE_PRODUCT_FEATURE_ID,
        description: 'Metrics experience in Discover',
        products: [
          { name: 'observability', tier: 'complete' },
          { name: 'security', tier: 'complete' },
        ],
      },
    ]);

    return {};
  }

  public start(core: CoreStart, deps: DiscoverServerPluginStartDeps) {
    return { locator: initializeLocatorServices(core, deps) };
  }

  public stop() {}
}
