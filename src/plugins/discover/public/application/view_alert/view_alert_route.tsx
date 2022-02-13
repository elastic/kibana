/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { sha256 } from 'js-sha256';
import { i18n } from '@kbn/i18n';
import { ToastsStart } from 'kibana/public';
import type { Alert } from '../../../../../../x-pack/plugins/alerting/common';
import { AlertTypeParams } from '../../../../../../x-pack/plugins/alerting/common';
import { Filter, SerializedSearchSourceFields } from '../../../../data/common';
import { MarkdownSimple, toMountPoint } from '../../../../kibana_react/public';
import { DiscoverAppLocatorParams } from '../../locator';
import { withQueryParams } from '../../utils/with_query_params';
import { useDiscoverServices } from '../../utils/use_discover_services';

interface SearchThresholdAlertParams extends AlertTypeParams {
  searchConfiguration: SerializedSearchSourceFields;
}

interface ViewAlertProps {
  from: string;
  to: string;
  checksum: string;
}

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
    defaultMessage: `Displayed documents might not match the documents triggered notification, 
    since the rule configuration has been changed.`,
  });

  toastNotifications.addWarning({
    title: warnTitle,
    text: toMountPoint(<MarkdownSimple>{warnDescription}</MarkdownSimple>),
  });
};

const getCurrentChecksum = (params: SearchThresholdAlertParams) =>
  sha256.create().update(JSON.stringify(params)).hex();

function ViewAlert({ from, to, checksum }: ViewAlertProps) {
  const { core, data, locator, toastNotifications } = useDiscoverServices();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        return await core.http.get<Alert<SearchThresholdAlertParams>>(
          `${LEGACY_BASE_ALERT_API_PATH}/alert/${id}`
        );
      } catch (error) {
        const errorTitle = i18n.translate('discover.viewAlert.alertRuleFetchErrorTitle', {
          defaultMessage: 'Alert rule fetch error',
        });
        displayError(errorTitle, error.message, toastNotifications);
      }
    };

    const fetchSearchSource = async (fetchedAlert: Alert<SearchThresholdAlertParams>) => {
      try {
        return await data.search.searchSource.create(fetchedAlert.params.searchConfiguration);
      } catch (error) {
        const errorTitle = i18n.translate('discover.viewAlert.searchSourceErrorTitle', {
          defaultMessage: 'Search source fetch error',
        });
        displayError(errorTitle, error.message, toastNotifications);
      }
    };

    const showDataViewFetchError = (alertId: string) => {
      const errorTitle = i18n.translate('discover.viewAlert.dataViewErrorTitle', {
        defaultMessage: 'Data view fetch error',
      });
      displayError(
        errorTitle,
        new Error(`Can't find data view of the alert rule with id ${alertId}.`).message,
        toastNotifications
      );
    };

    const navigateToResults = async () => {
      const fetchedAlert = await fetchAlert();
      if (!fetchedAlert) {
        history.push(DISCOVER_MAIN_ROUTE);
        return;
      }

      if (getCurrentChecksum(fetchedAlert.params) !== checksum) {
        displayRuleChangedWarn(toastNotifications);
      }

      const fetchedSearchSource = await fetchSearchSource(fetchedAlert);
      if (!fetchedSearchSource) {
        history.push(DISCOVER_MAIN_ROUTE);
        return;
      }

      const dataView = fetchedSearchSource.getField('index');
      if (!dataView) {
        showDataViewFetchError(fetchedAlert.id);
        history.push(DISCOVER_MAIN_ROUTE);
        return;
      }

      const state: DiscoverAppLocatorParams = {
        query: fetchedSearchSource.getField('query') || data.query.queryString.getDefaultQuery(),
        indexPatternId: dataView.id,
        timeRange: { from, to },
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
    checksum,
    from,
    to,
    history,
  ]);

  return null;
}

export const ViewAlertRoute = withQueryParams(ViewAlert, ['from', 'to', 'checksum']);
