/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaNoDataPage } from '@kbn/shared-ux-components';

interface Props {
  kibanaGuideDocLink: string;
  onDataViewCreated: (dataView: unknown) => void;
}

const solution = i18n.translate('sharedUXComponents.noDataConfig.analytics', {
  defaultMessage: 'Analytics',
});
const pageTitle = i18n.translate('sharedUX.noDataConfig.analyticsPageTitle', {
  defaultMessage: 'Welcome to Analytics!',
});
const addIntegrationsTitle = i18n.translate('sharedUX.noDataConfig.addIntegrationsTitle', {
  defaultMessage: 'Add integrations',
});
const addIntegrationsDescription = i18n.translate(
  'sharedUX.noDataConfig.addIntegrationsDescription',
  {
    defaultMessage: 'Use Elastic Agent to collect data and build out Analytics solutions.',
  }
);

export const AnalyticsNoDataPageComponent = ({ kibanaGuideDocLink, onDataViewCreated }: Props) => {
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
  return <KibanaNoDataPage noDataConfig={noDataConfig} onDataViewCreated={onDataViewCreated} />;
};
