/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { CustomIntegrationsPluginSetup } from '../../../../../custom_integrations/server';
import { HOME_APP_BASE_PATH } from '../../../../common/constants';
import { GLOBE_ICON_PATH } from '../data_sets/logs';

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
    icons: [{ type: 'svg', src: core.http.basePath.prepend(GLOBE_ICON_PATH) }],
    categories: ['sample_data'],
    shipper: 'sample_data',
  });
}
