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
}

const solution = i18n.translate('sharedUXPackages.noDataConfig.analytics', {
  defaultMessage: 'Analytics',
});

const pageTitle = i18n.translate('sharedUXPackages.noDataConfig.analyticsPageTitle', {
  defaultMessage: 'Welcome to Analytics!',
});

const addIntegrationsTitle = i18n.translate('sharedUXPackages.noDataConfig.addIntegrationsTitle', {
  defaultMessage: 'Add integrations',
});

const addIntegrationsDescription = i18n.translate(
  'sharedUXPackages.noDataConfig.addIntegrationsDescription',
  {
    defaultMessage: 'Use Elastic Agent to collect data and build out Analytics solutions.',
  }
);

/**
 * A pure component of an entire page that can be displayed when Kibana "has no data", specifically for Analytics.
 */
export const AnalyticsNoDataPage = ({
  kibanaGuideDocLink,
  onDataViewCreated,
  allowAdHocDataView,
}: Props) => {
  const noDataConfig = {
    solution,
    pageTitle,
    logo: 'logoKibana',
    action: {
      elasticAgent: {
        title: addIntegrationsTitle,
        description: addIntegrationsDescription,
        'data-test-subj': 'kbnOverviewAddIntegrations',
      },
    },
    docsLink: kibanaGuideDocLink,
  };
  return <KibanaNoDataPage {...{ noDataConfig, onDataViewCreated, allowAdHocDataView }} />;
};
