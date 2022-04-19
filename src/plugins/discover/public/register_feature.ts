/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
<<<<<<< HEAD
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
=======
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '@kbn/home-plugin/public';
>>>>>>> upstream/main

export function registerFeature(home: HomePublicPluginSetup) {
  home.featureCatalogue.register({
    id: 'discover',
    title: i18n.translate('discover.discoverTitle', {
      defaultMessage: 'Discover',
    }),
    subtitle: i18n.translate('discover.discoverSubtitle', {
      defaultMessage: 'Search and find insights.',
    }),
    description: i18n.translate('discover.discoverDescription', {
      defaultMessage: 'Interactively explore your data by querying and filtering raw documents.',
    }),
    icon: 'discoverApp',
    path: '/app/discover#/',
    showOnHomePage: false,
    category: 'data',
    solutionId: 'kibana',
    order: 200,
  });
}
