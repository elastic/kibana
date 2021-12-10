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
import { Doc } from './components/doc';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useIndexPattern } from '../../utils/use_index_pattern';
import { DiscoverRouteProps } from '../types';
import { withQueryParams } from '../../utils/with_query_params';

export interface SingleDocRouteProps extends DiscoverRouteProps {
  /**
   * Document id
   */
  id: string;
}

export interface DocUrlParams {
  indexPatternId: string;
  index: string;
}

const SingleDoc = (props: SingleDocRouteProps) => {
  const { id, services } = props;
  const { chrome, timefilter } = services;

  const { indexPatternId, index } = useParams<DocUrlParams>();

  useEffect(() => {
    chrome.setBreadcrumbs([
      ...getRootBreadcrumbs(),
      {
        text: `${index}#${id}`,
      },
    ]);
  }, [chrome, index, id]);

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
