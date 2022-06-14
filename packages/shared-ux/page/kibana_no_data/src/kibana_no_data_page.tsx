/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { EuiLoadingElastic } from '@elastic/eui';
import { NoDataConfigPage, NoDataPageProps } from '@kbn/shared-ux-components';
import { NoDataViewsPrompt } from '@kbn/shared-ux-prompt-no-data-views';

import { useServices } from './services';

/**
 * Props for `KibanaNoDataPage`.
 */
export interface Props {
  /** Handler for successfully creating a new data view. */
  onDataViewCreated: (dataView: unknown) => void;
  /** `NoDataPage` configuration; see `NoDataPageProps`. */
  noDataConfig: NoDataPageProps;
}

/**
 * A page to display when Kibana has no data, prompting a person to add integrations or create a new data view.
 */
export const KibanaNoDataPage = ({ onDataViewCreated, noDataConfig }: Props) => {
  // These hooks are temporary, until this component is moved to a package.
  const services = useServices();
  const { hasESData, hasUserDataView } = services;

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
    return <EuiLoadingElastic css={{ margin: 'auto' }} size="xxl" />;
  }

  if (!hasUserDataViews && dataExists) {
    return <NoDataViewsPrompt onDataViewCreated={onDataViewCreated} />;
  }

  if (!dataExists) {
    return <NoDataConfigPage noDataConfig={noDataConfig} />;
  }

  return null;
};
