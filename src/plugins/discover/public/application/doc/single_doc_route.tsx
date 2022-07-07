/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { getRootBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useDataView } from '../../hooks/use_data_view';
import { withQueryParams } from '../../utils/with_query_params';
import { useMainRouteBreadcrumb } from '../../hooks/use_navigation_props';
import { Doc } from './components/doc';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export interface SingleDocRouteProps {
  /**
   * Document id
   */
  id: string;
}

export interface DocUrlParams {
  dataViewId: string;
  index: string;
}

const SingleDoc = ({ id }: SingleDocRouteProps) => {
  const services = useDiscoverServices();
  const { chrome, timefilter, core } = services;

  const { dataViewId, index } = useParams<DocUrlParams>();
  const breadcrumb = useMainRouteBreadcrumb();

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'single-doc',
    id: dataViewId,
  });

  useEffect(() => {
    chrome.setBreadcrumbs([
      ...getRootBreadcrumbs(breadcrumb),
      {
        text: `${index}#${id}`,
      },
    ]);
  }, [chrome, index, id, breadcrumb]);

  useEffect(() => {
    timefilter.disableAutoRefreshSelector();
    timefilter.disableTimeRangeSelector();
  });

  const { dataView, error } = useDataView(services.dataViews, dataViewId);

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={
          <FormattedMessage
            id="discover.singleDocRoute.errorTitle"
            defaultMessage="An error occurred"
          />
        }
        body={
          <FormattedMessage
            id="discover.singleDocRoute.errorMessage"
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

  return (
    <div className="app-container">
      <Doc id={id} index={index} dataView={dataView} />
    </div>
  );
};

export const SingleDocRoute = withQueryParams(SingleDoc, ['id']);
