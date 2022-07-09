/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getStateFromKbnUrl, setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { useState, useEffect } from 'react';
import { DiscoverServices } from '../../../build_services';
import { useMainRouteBreadcrumb } from '../../../hooks/use_navigation_props';
import { getRootBreadcrumbs } from '../../../utils/breadcrumbs';
import { GlobalState } from '../services/context_state';

const GLOBAL_STATE_URL_KEY = '_g';

export const useContextMainRouteBreadcrumb = ({ chrome, filterManager }: DiscoverServices) => {
  // Ensure the Discover breadcrumb link includes the current pinned filters
  const [globalFilters, setGlobalFilters] = useState(filterManager.getGlobalFilters());
  const [breadcrumb, setBreadcrumb] = useState(useMainRouteBreadcrumb());

  useEffect(() => {
    const filterSubscription = filterManager.getUpdates$().subscribe(() => {
      setGlobalFilters(filterManager.getGlobalFilters());
    });

    return () => filterSubscription.unsubscribe();
  }, [filterManager]);

  useEffect(() => {
    setBreadcrumb((currentBreadcrumb) => {
      if (!currentBreadcrumb) {
        return currentBreadcrumb;
      }

      const breadcrumbGlobalState = getStateFromKbnUrl<GlobalState>(
        GLOBAL_STATE_URL_KEY,
        currentBreadcrumb
      );

      if (breadcrumbGlobalState) {
        breadcrumbGlobalState.filters = globalFilters;
      }

      return setStateToKbnUrl(
        GLOBAL_STATE_URL_KEY,
        breadcrumbGlobalState,
        undefined,
        currentBreadcrumb
      );
    });
  }, [globalFilters]);

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
};
