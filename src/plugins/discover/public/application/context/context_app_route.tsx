/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ContextApp } from './context_app';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useIndexPattern } from '../../hooks/use_index_pattern';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useContextMainRouteBreadcrumb } from './hooks/use_context_main_route_breadcrumb';

export interface ContextUrlParams {
  indexPatternId: string;
  id: string;
}

export function ContextAppRoute() {
  const services = useDiscoverServices();
  const { indexPatternId, id } = useParams<ContextUrlParams>();
  const anchorId = decodeURIComponent(id);
  const dataViewId = decodeURIComponent(indexPatternId);
  const { indexPattern, error } = useIndexPattern(services.indexPatterns, dataViewId);

  useContextMainRouteBreadcrumb(services);

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

  if (!indexPattern) {
    return <LoadingIndicator />;
  }

  return <ContextApp anchorId={anchorId} indexPattern={indexPattern} />;
}
