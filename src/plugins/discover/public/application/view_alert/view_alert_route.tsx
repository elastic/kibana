/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { sha256 } from 'js-sha256';
import type { Rule } from '../../../../../../x-pack/plugins/alerting/common';
import { getTime, IndexPattern } from '../../../../data/common';
import type { Filter } from '../../../../data/public';
import { DiscoverAppLocatorParams } from '../../locator';
import { useDiscoverServices } from '../../utils/use_discover_services';
import { getAlertUtils, QueryParams, SearchThresholdAlertParams } from './view_alert_utils';

type NonNullableEntry<T> = { [K in keyof T]: NonNullable<T[keyof T]> };

const getCurrentChecksum = (params: SearchThresholdAlertParams) =>
  sha256.create().update(JSON.stringify(params)).hex();

const isActualAlert = (queryParams: QueryParams): queryParams is NonNullableEntry<QueryParams> => {
  return Boolean(queryParams.from && queryParams.to && queryParams.checksum);
};

const buildTimeRangeFilter = (
  dataView: IndexPattern,
  fetchedAlert: Rule<SearchThresholdAlertParams>,
  timeFieldName: string
) => {
  const filter = getTime(dataView, {
    from: `now-${fetchedAlert.params.timeWindowSize}${fetchedAlert.params.timeWindowUnit}`,
    to: 'now',
  });
  return {
    from: filter?.query.range[timeFieldName].gte,
    to: filter?.query.range[timeFieldName].lte,
  };
};

const DISCOVER_MAIN_ROUTE = '/';

export function ViewAlertRoute() {
  const { core, data, locator, toastNotifications } = useDiscoverServices();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { search } = useLocation();

  const query = useMemo(() => new URLSearchParams(search), [search]);

  const queryParams: QueryParams = useMemo(
    () => ({
      from: query.get('from'),
      to: query.get('to'),
      checksum: query.get('checksum'),
    }),
    [query]
  );

  const openActualAlert = useMemo(() => isActualAlert(queryParams), [queryParams]);

  useEffect(() => {
    const {
      fetchAlert,
      fetchSearchSource,
      displayRuleChangedWarn,
      displayPossibleDocsDiffInfoAlert,
      showDataViewFetchError,
    } = getAlertUtils(toastNotifications, core, data);

    const navigateToResults = async () => {
      const fetchedAlert = await fetchAlert(id);
      if (!fetchedAlert) {
        history.push(DISCOVER_MAIN_ROUTE);
        return;
      }

      const calculatedChecksum = getCurrentChecksum(fetchedAlert.params);
      if (openActualAlert && calculatedChecksum !== queryParams.checksum) {
        displayRuleChangedWarn();
      } else if (openActualAlert && calculatedChecksum === queryParams.checksum) {
        displayPossibleDocsDiffInfoAlert();
      }

      const fetchedSearchSource = await fetchSearchSource(fetchedAlert);
      if (!fetchedSearchSource) {
        history.push(DISCOVER_MAIN_ROUTE);
        return;
      }

      const dataView = fetchedSearchSource.getField('index');
      const timeFieldName = dataView?.timeFieldName;
      if (!dataView || !timeFieldName) {
        showDataViewFetchError(fetchedAlert.id);
        history.push(DISCOVER_MAIN_ROUTE);
        return;
      }

      const timeRange = openActualAlert
        ? { from: queryParams.from, to: queryParams.to }
        : buildTimeRangeFilter(dataView, fetchedAlert, timeFieldName);
      const state: DiscoverAppLocatorParams = {
        query: fetchedSearchSource.getField('query') || data.query.queryString.getDefaultQuery(),
        indexPatternId: dataView.id,
        timeRange,
      };

      const filters = fetchedSearchSource.getField('filter');
      if (filters) {
        state.filters = filters as Filter[];
      }

      await locator.navigate(state);
    };

    navigateToResults();
  }, [
    toastNotifications,
    data.query.queryString,
    data.search.searchSource,
    core.http,
    locator,
    id,
    queryParams,
    history,
    openActualAlert,
    core,
    data,
  ]);

  return null;
}
