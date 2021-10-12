/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'kibana/server';
import { CustomIntegrationsPluginSetup } from '../../../../../custom_integrations/server';
import { SampleDatasetSchema } from './sample_dataset_schema';
import { HOME_APP_BASE_PATH } from '../../../../common/constants';

export function registerSampleDatasetWithIntegration(
  customIntegrations: CustomIntegrationsPluginSetup,
  core: CoreSetup,
  sampleDataset: SampleDatasetSchema
) {
  customIntegrations.registerCustomIntegration({
    id: sampleDataset.id,
    title: sampleDataset.name,
    description: sampleDataset.description,
    uiInternalPath: `${HOME_APP_BASE_PATH}#/tutorial_directory/sampleData`,
    isBeta: false,
    icons: sampleDataset.iconPath
      ? [
          {
            type: 'svg',
            src: core.http.basePath.prepend(sampleDataset.iconPath),
          },
        ]
      : [],
    categories: ['sample_data'],
    shipper: 'sample_data',
  });
}
