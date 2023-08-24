/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaNoDataPage } from '@kbn/shared-ux-page-kibana-no-data';
import { KibanaNoDataPageProps } from '@kbn/shared-ux-page-kibana-no-data-types';
import { AnalyticsNoDataPageFlavor } from '@kbn/shared-ux-page-analytics-no-data-types';

/**
 * Props for the pure component.
 */
export interface Props {
  /** A link to documentation. */
  kibanaGuideDocLink: string;
  /** Handler for successfully creating a new data view. */
  onDataViewCreated: (dataView: unknown) => void;
  /** if set to true allows creation of an ad-hoc dataview from data view editor */
  allowAdHocDataView?: boolean;
  /** if the kibana instance is customly branded */
  showPlainSpinner: boolean;
  /** The flavor of the empty page to use. */
  pageFlavor?: AnalyticsNoDataPageFlavor;
  prependBasePath: (path: string) => string;
}

const flavors: {
  [K in AnalyticsNoDataPageFlavor]: (deps: {
    kibanaGuideDocLink: string;
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
  serverless_search: ({ prependBasePath }) => ({
    solution: i18n.translate('sharedUXPackages.noDataConfig.analytics', {
      defaultMessage: 'Elasticsearch',
    }),
    pageTitle: i18n.translate('sharedUXPackages.noDataConfig.analyticsPageTitle', {
      defaultMessage: 'Welcome to Elasticsearch!',
    }),
    logo: 'logoElasticsearch',
    action: {
      elasticsearch: {
        title: i18n.translate('sharedUXPackages.noDataConfig.elasticsearchTitle', {
          defaultMessage: 'Get started',
        }),
        description: i18n.translate('sharedUXPackages.noDataConfig.elasticsearchDescription', {
          defaultMessage:
            'Set up your programming language client, ingest some data, and start searching.',
        }),
        'data-test-subj': 'kbnOverviewElasticsearchGettingStarted',
        href: prependBasePath('/app/elasticsearch/'),
        /** force the no data card to be shown **/
        canAccessFleet: true,
      },
    },
  }),
};

/**
 * A pure component of an entire page that can be displayed when Kibana "has no data", specifically for Analytics.
 */
export const AnalyticsNoDataPage = ({
  kibanaGuideDocLink,
  onDataViewCreated,
  allowAdHocDataView,
  showPlainSpinner,
  prependBasePath,
  pageFlavor = 'kibana',
}: Props) => {
  const noDataConfig: KibanaNoDataPageProps['noDataConfig'] = flavors[pageFlavor]({
    kibanaGuideDocLink,
    prependBasePath,
  });

  return (
    <KibanaNoDataPage
      {...{ noDataConfig, onDataViewCreated, allowAdHocDataView, showPlainSpinner }}
    />
  );
};
