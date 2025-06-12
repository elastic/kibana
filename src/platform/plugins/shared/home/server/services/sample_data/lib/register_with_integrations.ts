/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { HOME_APP_BASE_PATH } from '../../../../common/constants';

export function registerSampleDatasetWithIntegration(
  customIntegrations: CustomIntegrationsPluginSetup,
  core: CoreSetup
) {
  customIntegrations.registerCustomIntegration({
    id: 'sample_data_all',
    title: i18n.translate('home.sampleData.customIntegrationsTitle', {
      defaultMessage: 'Sample Data',
    }),
    description: i18n.translate('home.sampleData.customIntegrationsDescription', {
      defaultMessage: 'Explore data in Kibana with these one-click data sets.',
    }),
    uiInternalPath: `${HOME_APP_BASE_PATH}#/tutorial_directory/sampleData`,
    isBeta: false,
    icons: [
      {
        type: 'svg',
        src: core.http.staticAssets.getPluginAssetHref('/sample_data_resources/logs/icon.svg'),
      },
    ],
    categories: ['custom'],
    shipper: 'sample_data',
  });
}
