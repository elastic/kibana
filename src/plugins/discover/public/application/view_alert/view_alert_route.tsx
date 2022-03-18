/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useMemo } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { sha256 } from 'js-sha256';
import { i18n } from '@kbn/i18n';
import { ToastsStart } from 'kibana/public';
import type { Alert } from '../../../../../../x-pack/plugins/alerting/common';
import type { AlertTypeParams } from '../../../../../../x-pack/plugins/alerting/common';
import { getTime, SerializedSearchSourceFields } from '../../../../data/common';
import type { Filter, TimeRange } from '../../../../data/public';
import { MarkdownSimple, toMountPoint } from '../../../../kibana_react/public';
import { DiscoverAppLocatorParams } from '../../locator';
import { useDiscoverServices } from '../../utils/use_discover_services';

interface SearchThresholdAlertParams extends AlertTypeParams {
  searchConfiguration: SerializedSearchSourceFields;
}

interface QueryParams {
  from: string | null;
  to: string | null;
  checksum: string | null;
}

type NonNullableEntry<T> = { [K in keyof T]: NonNullable<T[keyof T]> };

const LEGACY_BASE_ALERT_API_PATH = '/api/alerts';
const DISCOVER_MAIN_ROUTE = '/';

const displayError = (title: string, errorMessage: string, toastNotifications: ToastsStart) => {
  toastNotifications.addDanger({
    title,
    text: toMountPoint(<MarkdownSimple>{errorMessage}</MarkdownSimple>),
  });
};

const displayRuleChangedWarn = (toastNotifications: ToastsStart) => {
  const warnTitle = i18n.translate('discover.viewAlert.alertRuleChangedWarnTitle', {
    defaultMessage: 'Alert rule has changed',
  });
  const warnDescription = i18n.translate('discover.viewAlert.alertRuleChangedWarnDescription', {
    defaultMessage: `The displayed documents might not match the documents that triggered the alert
     because the rule configuration changed.`,
  });

  toastNotifications.addWarning({
    title: warnTitle,
    text: toMountPoint(<MarkdownSimple>{warnDescription}</MarkdownSimple>),
  });
};

const displayPossibleDocsDiffInfoAlert = (toastNotifications: ToastsStart) => {
  const infoTitle = i18n.translate('discover.viewAlert.documentsMayVaryInfoTitle', {
    defaultMessage: 'Displayed documents may vary',
  });
  const infoDescription = i18n.translate('discover.viewAlert.documentsMayVaryInfoDescription', {
    defaultMessage: `The displayed documents might differ from the documents that triggered the alert.
       Some documents might have been added or deleted.`,
  });

  toastNotifications.addInfo({
    title: infoTitle,
    text: toMountPoint(<MarkdownSimple>{infoDescription}</MarkdownSimple>),
  });
};

const getCurrentChecksum = (params: SearchThresholdAlertParams) =>
  sha256.create().update(JSON.stringify(params)).hex();

const isActualAlert = (queryParams: QueryParams): queryParams is NonNullableEntry<QueryParams> => {
  return Boolean(queryParams.from && queryParams.to && queryParams.checksum);
};

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

  const openConcreteAlert = isActualAlert(queryParams);

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        return await core.http.get<Alert<SearchThresholdAlertParams>>(
          `${LEGACY_BASE_ALERT_API_PATH}/alert/${id}`
        );
      } catch (error) {
        const errorTitle = i18n.translate('discover.viewAlert.alertRuleFetchErrorTitle', {
          defaultMessage: 'Error fetching alert rule',
        });
        displayError(errorTitle, error.message, toastNotifications);
      }
    };

    const fetchSearchSource = async (fetchedAlert: Alert<SearchThresholdAlertParams>) => {
      try {
        return await data.search.searchSource.create(fetchedAlert.params.searchConfiguration);
      } catch (error) {
        const errorTitle = i18n.translate('discover.viewAlert.searchSourceErrorTitle', {
          defaultMessage: 'Error fetching search source',
        });
        displayError(errorTitle, error.message, toastNotifications);
      }
    };

    const showDataViewFetchError = (alertId: string) => {
      const errorTitle = i18n.translate('discover.viewAlert.dataViewErrorTitle', {
        defaultMessage: 'Error fetching data view',
      });
      displayError(
        errorTitle,
        new Error(`Data view failure of the alert rule with id ${alertId}.`).message,
        toastNotifications
      );
    };

    const navigateToResults = async () => {
      const fetchedAlert = await fetchAlert();
      if (!fetchedAlert) {
        history.push(DISCOVER_MAIN_ROUTE);
        return;
      }

      const calculatedChecksum = getCurrentChecksum(fetchedAlert.params);
      if (openConcreteAlert && calculatedChecksum !== queryParams.checksum) {
        displayRuleChangedWarn(toastNotifications);
      } else if (openConcreteAlert && calculatedChecksum === queryParams.checksum) {
        displayPossibleDocsDiffInfoAlert(toastNotifications);
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

      let timeRange: TimeRange;
      if (openConcreteAlert) {
        timeRange = { from: queryParams.from, to: queryParams.to };
      } else {
        const filter = getTime(dataView, {
          from: `now-${fetchedAlert.params.timeWindowSize}${fetchedAlert.params.timeWindowUnit}`,
          to: 'now',
        });
        timeRange = {
          from: filter?.query.range[timeFieldName].gte,
          to: filter?.query.range[timeFieldName].lte,
        };
      }

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
    openConcreteAlert,
  ]);

  return null;
}
