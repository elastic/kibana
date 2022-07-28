/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ContextApp } from './context_app';
import { getRootBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useDataView } from '../../hooks/use_data_view';
import { useMainRouteBreadcrumb } from '../../hooks/use_navigation_props';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export interface ContextUrlParams {
  dataViewId: string;
  id: string;
}

export function ContextAppRoute() {
  const services = useDiscoverServices();
  const { chrome } = services;

  const { dataViewId, id } = useParams<ContextUrlParams>();
  const anchorId = decodeURIComponent(id);
  const usedDataViewId = decodeURIComponent(dataViewId);
  const breadcrumb = useMainRouteBreadcrumb();

  useEffect(() => {
    chrome.setBreadcrumbs([
      ...getRootBreadcrumbs(breadcrumb),
      {
        text: i18n.translate('discover.context.breadcrumb', {
          defaultMessage: 'Surrounding documents',
        }),
      },
    ]);
  }, [chrome, breadcrumb]);

  const { dataView, error } = useDataView(services.dataViews, usedDataViewId);

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={
          <FormattedMessage
            id="discover.contextViewRoute.errorTitle"
            defaultMessage="An error occurred"
          />
        }
        body={
          <FormattedMessage
            id="discover.contextViewRoute.errorMessage"
            defaultMessage="No matching data view for id {dataViewId}"
            values={{ dataViewId }}
          />
        }
      />
    );
  }

  if (!dataView) {
    return <LoadingIndicator />;
  }

  return <ContextApp anchorId={anchorId} dataView={dataView} />;
}
