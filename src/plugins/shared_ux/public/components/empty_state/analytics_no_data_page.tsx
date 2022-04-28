/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import { SharedUxServicesProvider } from '@kbn/shared-ux-services';

import { getSharedUXServices } from '../../plugin';
import { AnalyticsNoDataPageComponent } from './analytics_no_data_page.component';

export interface AnalyticsNoDataPageProps {
  onDataViewCreated: (dataView: unknown) => void;
}

export const AnalyticsNoDataPage = ({ onDataViewCreated }: AnalyticsNoDataPageProps) => {
  const services = getSharedUXServices();
  const { kibanaGuideDocLink } = services.docLinks;
  return (
    <SharedUxServicesProvider {...services}>
      <AnalyticsNoDataPageComponent
        kibanaGuideDocLink={kibanaGuideDocLink}
        onDataViewCreated={onDataViewCreated}
      />
      ;
    </SharedUxServicesProvider>
  );
};
