/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { i18n } from '@kbn/i18n';
import { AnalyticsNoDataPageFlavor, Services } from '@kbn/shared-ux-page-analytics-no-data-types';
import { KibanaNoDataPage } from '@kbn/shared-ux-page-kibana-no-data';
import { KibanaNoDataPageProps } from '@kbn/shared-ux-page-kibana-no-data-types';
import { getHasApiKeys$ } from '../lib/get_has_api_keys';

/**
 * Props for the pure component.
 */
export interface Props {
  /** Handler for successfully creating a new data view. */
  onDataViewCreated: (dataView: unknown) => void;
  /** Handler for when try ES|QL is clicked and user has been navigated to try ES|QL in discover. */
  onESQLNavigationComplete?: () => void;
  /** if set to true allows creation of an ad-hoc dataview from data view editor */
  allowAdHocDataView?: boolean;
  /** if the kibana instance is customly branded */
  showPlainSpinner: boolean;
}

type AnalyticsNoDataPageProps = Props &
  Pick<Services, 'getHttp' | 'prependBasePath' | 'kibanaGuideDocLink' | 'pageFlavor'>;

const flavors: {
  [K in AnalyticsNoDataPageFlavor]: (deps: {
    kibanaGuideDocLink: string;
    hasApiKeys: boolean;
    prependBasePath: (path: string) => string;
  }) => KibanaNoDataPageProps['noDataConfig'];
} = {
  kibana: ({ kibanaGuideDocLink }) => ({
    solution: i18n.translate('sharedUXPackages.noDataConfig.analytics', {
      defaultMessage: 'Analytics',
    }),
    pageTitle: i18n.translate('sharedUXPackages.noDataConfig.analyticsPageTitle', {
      defaultMessage: 'Welcome to Analytics!',
    }),
    logo: 'logoKibana',
    action: {
      elasticAgent: {
        title: i18n.translate('sharedUXPackages.noDataConfig.addIntegrationsTitle', {
          defaultMessage: 'Add integrations',
        }),
        description: i18n.translate('sharedUXPackages.noDataConfig.addIntegrationsDescription', {
          defaultMessage: 'Use Elastic Agent to collect data and build out Analytics solutions.',
        }),
        'data-test-subj': 'kbnOverviewAddIntegrations',
      },
    },
    docsLink: kibanaGuideDocLink,
  }),
  serverless_search: ({ hasApiKeys, prependBasePath }) => ({
    solution: i18n.translate('sharedUXPackages.noDataConfig.elasticsearch', {
      defaultMessage: 'Elasticsearch',
    }),
    pageTitle: i18n.translate('sharedUXPackages.noDataConfig.elasticsearchPageTitle', {
      defaultMessage: 'Welcome to Elasticsearch!',
    }),
    logo: 'logoElasticsearch',
    action: {
      elasticsearch: {
        title: i18n.translate('sharedUXPackages.noDataConfig.elasticsearchTitle', {
          defaultMessage: 'Add data',
        }),
        description: i18n.translate('sharedUXPackages.noDataConfig.elasticsearchDescription', {
          defaultMessage:
            'Set up your programming language client, ingest some data, and start searching.',
        }),
        'data-test-subj': 'kbnOverviewElasticsearchAddData',
        href: hasApiKeys
          ? prependBasePath('/app/elasticsearch/#ingestData') // use Ingest Data section of Home page if project has ES API keys
          : prependBasePath('/app/elasticsearch/'),
        /** force the no data card to be shown **/
        canAccessFleet: true,
      },
    },
  }),
  serverless_observability: ({ prependBasePath }) => ({
    solution: i18n.translate('sharedUXPackages.noDataConfig.observability', {
      defaultMessage: 'Observability',
    }),
    pageTitle: i18n.translate('sharedUXPackages.noDataConfig.observabilityPageTitle', {
      defaultMessage: 'Welcome to Elastic Observability!',
    }),
    pageDescription: i18n.translate('sharedUXPackages.noDataConfig.observabilityPageDescription', {
      defaultMessage:
        'Converge metrics, logs, and traces to monitor the health of your applications.',
    }),
    logo: 'logoObservability',
    action: {
      observability: {
        title: i18n.translate('sharedUXPackages.noDataConfig.observabilityTitle', {
          defaultMessage: 'Add data',
        }),
        description: i18n.translate('sharedUXPackages.noDataConfig.observabilityDescription', {
          defaultMessage: 'Get started by collecting data using one of our many integrations.',
        }),
        'data-test-subj': 'kbnObservabilityNoData',
        href: prependBasePath('/app/observabilityOnboarding/'),
      },
    },
  }),
};

/**
 * A pure component of an entire page that can be displayed when Kibana "has no data", specifically for Analytics.
 */
export const AnalyticsNoDataPage: React.FC<AnalyticsNoDataPageProps> = ({
  onDataViewCreated,
  onESQLNavigationComplete,
  allowAdHocDataView,
  showPlainSpinner,
  ...services
}) => {
  const { prependBasePath, kibanaGuideDocLink, getHttp: get, pageFlavor } = services;
  const { hasApiKeys } = useObservable(useMemo(() => getHasApiKeys$({ get }), [get])) ?? {};

  const noDataConfig: KibanaNoDataPageProps['noDataConfig'] = flavors[pageFlavor]({
    kibanaGuideDocLink,
    prependBasePath,
    hasApiKeys: Boolean(hasApiKeys),
  });

  return (
    <KibanaNoDataPage
      {...{
        noDataConfig,
        onDataViewCreated,
        onESQLNavigationComplete,
        allowAdHocDataView,
        showPlainSpinner,
      }}
    />
  );
};
