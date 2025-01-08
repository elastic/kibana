/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { SampleDataRegistrySetup } from '@kbn/home-plugin/server';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/common';
import { APP_ICON } from '../../common';

function getDiscoverPathForSampleDataset(objId: string) {
  // TODO: remove the time range from the URL query when saved search objects start supporting time range configuration
  // https://github.com/elastic/kibana/issues/9761
  return `${getSavedSearchFullPathUrl(objId)}?_g=(time:(from:now-7d,to:now))`;
}

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
          getPath: getDiscoverPathForSampleDataset,
          label: linkLabel,
          icon: APP_ICON,
          order: -1,
        },
      ]);
    }
  });
}
