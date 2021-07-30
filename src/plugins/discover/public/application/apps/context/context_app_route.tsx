/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { IndexPattern, IndexPatternAttributes, SavedObject } from '../../../../../data/common';
import { DiscoverServices } from '../../../build_services';
import { ContextApp } from '../../components/context_app/context_app';
import { getRootBreadcrumbs } from '../../helpers/breadcrumbs';

export interface ContextMainProps {
  /**
   * List of available index patterns
   */
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}

export interface ContextUrlParams {
  indexPatternId: string;
  id: string;
}

export function ContextAppRoute(props: ContextMainProps) {
  const { services } = props;
  const { chrome } = services;

  const { indexPatternId, id } = useParams<ContextUrlParams>();
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);

  useEffect(() => {
    chrome.setBreadcrumbs([
      ...getRootBreadcrumbs(),
      {
        text: i18n.translate('discover.context.breadcrumb', {
          defaultMessage: 'Surrounding documents',
        }),
      },
    ]);
  }, [chrome, id]);

  async function getIndexPattern() {
    const ip = await services.indexPatterns.get(indexPatternId);
    setIndexPattern(ip);
  }

  getIndexPattern();

  if (!indexPattern) {
    return null;
  }

  return <ContextApp indexPatternId={indexPatternId} anchorId={id} indexPattern={indexPattern} />;
}
