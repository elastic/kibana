/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import type { AnalyticsNoDataPageProps } from '@kbn/shared-ux-page-analytics-no-data-types';

import useObservable from 'react-use/lib/useObservable';
import { useServices } from './services';
import { AnalyticsNoDataPage as Component } from './analytics_no_data_page.component';

/**
 * An entire page that can be displayed when Kibana "has no data", specifically for Analytics.  Uses
 * services from a Provider to supply props to a pure component.
 */
export const AnalyticsNoDataPage = ({
  onDataViewCreated,
  allowAdHocDataView,
}: AnalyticsNoDataPageProps) => {
  const services = useServices();
  const { kibanaGuideDocLink, customBranding } = services;
  const { hasCustomBranding$ } = customBranding;
  const showPlainSpinner = useObservable(hasCustomBranding$) ?? false;

  return (
    <Component
      {...{
        onDataViewCreated,
        allowAdHocDataView,
        kibanaGuideDocLink,
        showPlainSpinner,
      }}
    />
  );
};
