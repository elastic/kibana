/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { useData, useDocLinks, useEditors, usePermissions } from '@kbn/shared-ux-services';
import {
  NoDataViewsPrompt,
  NoDataViewsPromptProvider,
  NoDataViewsPromptServices,
} from '@kbn/shared-ux-prompt-no-data-views';
import { EuiLoadingElastic } from '@elastic/eui';
import { NoDataConfigPage, NoDataPageProps } from '../page_template';

export interface Props {
  onDataViewCreated: (dataView: unknown) => void;
  noDataConfig: NoDataPageProps;
}

export const KibanaNoDataPage = ({ onDataViewCreated, noDataConfig }: Props) => {
  // These hooks are temporary, until this component is moved to a package.
  const { canCreateNewDataView } = usePermissions();
  const { dataViewsDocLink } = useDocLinks();
  const { openDataViewEditor } = useEditors();

  const { hasESData, hasUserDataView } = useData();
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

  /*
    TODO: clintandrewhall - the use and population of `NoDataViewPromptProvider` here is temporary,
    until `KibanaNoDataPage` is moved to a package of its own.

    Once `KibanaNoDataPage` is moved to a package, `NoDataViewsPromptProvider` will be *combined*
    with `KibanaNoDataPageProvider`, creating a single Provider that manages contextual dependencies
    throughout the React tree from the top-level of composition and consumption.
  */
  if (!hasUserDataViews && dataExists) {
    const services: NoDataViewsPromptServices = {
      canCreateNewDataView,
      dataViewsDocLink,
      openDataViewEditor,
    };

    return (
      <NoDataViewsPromptProvider {...services}>
        <NoDataViewsPrompt onDataViewCreated={onDataViewCreated} />
      </NoDataViewsPromptProvider>
    );
  }

  if (!dataExists) {
    return <NoDataConfigPage noDataConfig={noDataConfig} />;
  }

  return null;
};
