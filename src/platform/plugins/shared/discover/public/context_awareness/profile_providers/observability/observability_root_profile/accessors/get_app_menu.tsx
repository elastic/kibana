/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMenuRegistry } from '@kbn/discover-utils';
import type { DataQualityLocatorParams } from '@kbn/deeplinks-observability';
import { DATA_QUALITY_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type { RootProfileProvider } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';

export const createGetAppMenu =
  (services: ProfileProviderServices): RootProfileProvider['profile']['getAppMenu'] =>
  (prev) =>
  (params) => ({
    appMenuRegistry: (registry) => {
      registerDatasetQualityLink(registry, services);

      return prev(params).appMenuRegistry(registry);
    },
  });

const registerDatasetQualityLink = (
  registry: AppMenuRegistry,
  { share, timefilter }: ProfileProviderServices
) => {
  const dataQualityLocator =
    share?.url.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);

  if (dataQualityLocator) {
    registry.registerItem({
      id: 'dataset-quality-link',
      label: i18n.translate('discover.observabilitySolution.appMenu.datasets', {
        defaultMessage: 'Data sets',
      }),
      order: 5,
      iconType: 'database',
      testId: 'discoverAppMenuDatasetQualityLink',
      run: ({ context: { onFinishAction } }) => {
        const refresh = timefilter.getRefreshInterval();
        const { from, to } = timefilter.getTime();

        dataQualityLocator.navigate({
          filters: {
            timeRange: {
              from: from ?? 'now-24h',
              to: to ?? 'now',
              refresh,
            },
          },
        });

        onFinishAction();
      },
    });
  }
};
