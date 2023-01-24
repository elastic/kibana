/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { EuiLoadingElastic, EuiLoadingSpinner } from '@elastic/eui';
import { NoDataConfigPage } from '@kbn/shared-ux-page-no-data-config';
import { NoDataViewsPrompt } from '@kbn/shared-ux-prompt-no-data-views';
import { KibanaNoDataPageProps } from '@kbn/shared-ux-page-kibana-no-data-types';

import { useServices } from './services';

/**
 * A page to display when Kibana has no data, prompting a person to add integrations or create a new data view.
 */
export const KibanaNoDataPage = ({
  onDataViewCreated,
  noDataConfig,
  allowAdHocDataView,
}: KibanaNoDataPageProps) => {
  // These hooks are temporary, until this component is moved to a package.
  const services = useServices();
  const { hasESData, hasUserDataView, showPlainSpinner } = services;

  const [isLoading, setIsLoading] = useState(true);
  const [dataExists, setDataExists] = useState(false);
  const [hasUserDataViews, setHasUserDataViews] = useState(false);

  useEffect(() => {
    const checkData = async () => {
      setDataExists(await hasESData());
      setHasUserDataViews(await hasUserDataView());
      setIsLoading(false);
    };
    // TODO: add error handling
    // https://github.com/elastic/kibana/issues/130913
    checkData().catch(() => {
      setIsLoading(false);
    });
  }, [hasESData, hasUserDataView]);

  if (isLoading) {
    return showPlainSpinner ? (
      <EuiLoadingSpinner css={{ margin: 'auto' }} size="xxl" />
    ) : (
      <EuiLoadingElastic css={{ margin: 'auto' }} size="xxl" />
    );
  }

  if (!hasUserDataViews && dataExists) {
    return (
      <NoDataViewsPrompt
        onDataViewCreated={onDataViewCreated}
        allowAdHocDataView={allowAdHocDataView}
      />
    );
  }

  if (!dataExists) {
    return <NoDataConfigPage noDataConfig={noDataConfig} />;
  }

  return null;
};
