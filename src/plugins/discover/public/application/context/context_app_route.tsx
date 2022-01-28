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
import { useIndexPattern } from '../../utils/use_index_pattern';
import { useMainRouteBreadcrumb } from '../../utils/use_navigation_props';
import { useDiscoverServices } from '../../utils/use_discover_services';

export interface ContextUrlParams {
  indexPatternId: string;
  id: string;
}

export function ContextAppRoute() {
  const services = useDiscoverServices();
  const { chrome } = services;

  const { indexPatternId, id } = useParams<ContextUrlParams>();
  const anchorId = decodeURIComponent(id);
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

  return <ContextApp anchorId={anchorId} indexPattern={indexPattern} />;
}
