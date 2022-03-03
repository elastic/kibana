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
import { getRootBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useIndexPattern } from '../../utils/use_index_pattern';
import { withQueryParams } from '../../utils/with_query_params';
import { useMainRouteBreadcrumb } from '../../utils/use_navigation_props';
import { Doc } from './components/doc';
import { useDiscoverServices } from '../../utils/use_discover_services';
import { useExecutionContext } from '../../../../kibana_react/public';

export interface SingleDocRouteProps {
  /**
   * Document id
   */
  id: string;
}

export interface DocUrlParams {
  indexPatternId: string;
  index: string;
}

const SingleDoc = ({ id }: SingleDocRouteProps) => {
  const services = useDiscoverServices();
  const { chrome, timefilter, core } = services;

  const { indexPatternId, index } = useParams<DocUrlParams>();
  const breadcrumb = useMainRouteBreadcrumb();

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'single-doc',
    id: indexPatternId,
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

  const { indexPattern, error } = useIndexPattern(services.indexPatterns, indexPatternId);

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={
          <FormattedMessage
            id="discover.singleDocRoute.errorTitle"
            defaultMessage="An error occured"
          />
        }
        body={
          <FormattedMessage
            id="discover.singleDocRoute.errorMessage"
            defaultMessage="No matching index pattern for id {indexPatternId}"
            values={{ indexPatternId }}
          />
        }
      />
    );
  }

  if (!indexPattern) {
    return <LoadingIndicator />;
  }

  return (
    <div className="app-container">
      <Doc id={id} index={index} indexPattern={indexPattern} />
    </div>
  );
};

export const SingleDocRoute = withQueryParams(SingleDoc, ['id']);
