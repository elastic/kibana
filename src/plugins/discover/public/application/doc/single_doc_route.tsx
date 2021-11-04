/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DiscoverServices } from '../../build_services';
import { getRootBreadcrumbs } from '../../utils/breadcrumbs';
import { Doc } from './components/doc';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useIndexPattern } from '../../utils/use_index_pattern';

export interface SingleDocRouteProps {
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}

export interface DocUrlParams {
  indexPatternId: string;
  index: string;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export function SingleDocRoute(props: SingleDocRouteProps) {
  const { services } = props;
  const { chrome, timefilter } = services;

  const { indexPatternId, index } = useParams<DocUrlParams>();

  const query = useQuery();
  const docId = query.get('id') || '';

  useEffect(() => {
    chrome.setBreadcrumbs([
      ...getRootBreadcrumbs(),
      {
        text: `${index}#${docId}`,
      },
    ]);
  }, [chrome, index, docId]);

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
      <Doc id={docId} index={index} indexPattern={indexPattern} />
    </div>
  );
}
