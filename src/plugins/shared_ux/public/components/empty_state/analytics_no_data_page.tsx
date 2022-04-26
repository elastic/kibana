/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { SharedUxServicesProvider } from '@kbn/shared-ux-services';
import { KibanaNoDataPage } from '@kbn/shared-ux-components';
import { getSharedUXServices } from '../../plugin';

interface Props {
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

export const AnalyticsNoDataPage = ({ onDataViewCreated }: Props) => {
  const services = getSharedUXServices();
  const { kibanaGuideDocLink } = services.docLinks;
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
  return (
    <SharedUxServicesProvider {...services}>
      <KibanaNoDataPage noDataConfig={noDataConfig} onDataViewCreated={onDataViewCreated} />;
    </SharedUxServicesProvider>
  );
};
