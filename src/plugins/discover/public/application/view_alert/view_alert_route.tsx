/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { DiscoverAppLocatorParams } from '../../../common/locator';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { displayPossibleDocsDiffInfoAlert } from '../main/hooks/use_alert_results_toast';
import { getAlertUtils, QueryParams } from './view_alert_utils';

type NonNullableEntry<T> = { [K in keyof T]: NonNullable<T[keyof T]> };

const isActualAlert = (queryParams: QueryParams): queryParams is NonNullableEntry<QueryParams> => {
  return Boolean(queryParams.from && queryParams.to);
};

export function ViewAlertRoute() {
  const { core, data, locator, toastNotifications, dataViews } = useDiscoverServices();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { search } = useLocation();

  const query = useMemo(() => new URLSearchParams(search), [search]);

  const queryParams: QueryParams = useMemo(
    () => ({
      from: query.get('from'),
      to: query.get('to'),
    }),
    [query]
  );

  /**
   * This flag indicates whether we should open the actual alert results or current state of documents.
   */
  const openActualAlert = useMemo(() => isActualAlert(queryParams), [queryParams]);

  useEffect(() => {
    const { fetchAlert, fetchSearchSource, buildLocatorParams } = getAlertUtils(
      openActualAlert,
      queryParams,
      toastNotifications,
      core,
      data,
      dataViews
    );

    const navigateWithDiscoverState = (state: DiscoverAppLocatorParams) => {
      if (openActualAlert) {
        displayPossibleDocsDiffInfoAlert(toastNotifications);
      }
      locator.navigate(state);
    };

    const navigateToDiscoverRoot = () => locator.navigate({});

    fetchAlert(id)
      .then(fetchSearchSource)
      .then(buildLocatorParams)
      .then(navigateWithDiscoverState)
      .catch(navigateToDiscoverRoot);
  }, [
    core,
    data,
    dataViews,
    history,
    id,
    locator,
    openActualAlert,
    queryParams,
    toastNotifications,
  ]);

  return null;
}
