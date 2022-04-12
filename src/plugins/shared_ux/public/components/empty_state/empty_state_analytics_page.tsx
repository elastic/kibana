/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useDocLinks, SharedUxServicesProvider } from '@kbn/shared-ux-services';
import { EmptyStatePage } from '@kbn/shared-ux-components';
import { servicesFactory } from '../../services';
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

export const EmptyStateAnalyticsPage = ({ onDataViewCreated }: Props) => {
  const services = getSharedUXServices();
  const { kibanaGuideDocLink } = services.docLinks;
  const noDataConfig = {
    solution,
    pageTitle,
    logo: 'logoKibana',
    action: {
      elasticAgent: {
        title: addIntegrationsTitle,
      },
    },
    docsLink: kibanaGuideDocLink,
  };
  return (
    <SharedUxServicesProvider {...services}>
      <EmptyStatePage noDataConfig={noDataConfig} onDataViewCreated={onDataViewCreated} />;
    </SharedUxServicesProvider>
  );
};
