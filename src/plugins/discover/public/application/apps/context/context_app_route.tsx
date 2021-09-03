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
import { DiscoverServices } from '../../../build_services';
import { ContextApp } from './context_app';
import { getRootBreadcrumbs } from '../../helpers/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useIndexPattern } from '../../helpers/use_index_pattern';

export interface ContextAppProps {
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}

export interface ContextUrlParams {
  indexPatternId: string;
  id: string;
}

export function ContextAppRoute(props: ContextAppProps) {
  const { services } = props;
  const { chrome } = services;

  const { indexPatternId, id } = useParams<ContextUrlParams>();

  useEffect(() => {
    chrome.setBreadcrumbs([
      ...getRootBreadcrumbs(),
      {
        text: i18n.translate('discover.context.breadcrumb', {
          defaultMessage: 'Surrounding documents',
        }),
      },
    ]);
  }, [chrome]);

  const indexPattern = useIndexPattern(services.indexPatterns, indexPatternId);

  if (!indexPattern) {
    return <LoadingIndicator />;
  }

  return <ContextApp indexPatternId={indexPatternId} anchorId={id} indexPattern={indexPattern} />;
}
