/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { SampleDataRegistrySetup } from '@kbn/home-plugin/server';
import { APP_ICON } from '../../common';

// TODO: update and use Discover locator instead
const getSampleSearchPath = (objId: string) => `/app/discover#/view/${encodeURIComponent(objId)}`;

export function registerSampleData(sampleDataRegistry: SampleDataRegistrySetup) {
  const linkLabel = i18n.translate('discover.sampleData.viewLinkLabel', {
    defaultMessage: 'Discover',
  });
  const { addAppLinksToSampleDataset, getSampleDatasets } = sampleDataRegistry;
  const sampleDatasets = getSampleDatasets();

  sampleDatasets.forEach((sampleDataset) => {
    const sampleSavedSearchObject = sampleDataset.savedObjects.find(
      (object) => object.type === 'search'
    );

    if (sampleSavedSearchObject) {
      addAppLinksToSampleDataset(sampleDataset.id, [
        {
          sampleObject: sampleSavedSearchObject,
          getPath: getSampleSearchPath,
          label: linkLabel,
          icon: APP_ICON,
          order: -1,
        },
      ]);
    }
  });
}
