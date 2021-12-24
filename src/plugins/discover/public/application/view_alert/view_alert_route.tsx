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
import { DiscoverRouteProps } from '../types';

interface SearchThresholdAlertParams extends AlertTypeParams {
  searchSource: SerializedSearchSourceFields;
}

interface ViewAlertProps extends DiscoverRouteProps {
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

function ViewAlert({ services, from, to, checksum }: ViewAlertProps) {
  const { core, data, locator, toastNotifications } = services;
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
        history.push(DISCOVER_MAIN_ROUTE);
      }
    };

    const fetchSearchSource = async (fetchedAlert: Alert<SearchThresholdAlertParams>) => {
      try {
        return await data.search.searchSource.create(fetchedAlert.params.searchSource);
      } catch (error) {
        const errorTitle = i18n.translate('discover.viewAlert.searchSourceErrorTitle', {
          defaultMessage: 'Search source fetch error',
        });
        displayError(errorTitle, error.message, toastNotifications);
        history.push(DISCOVER_MAIN_ROUTE);
      }
    };

    const getCurrentChecksum = (params: SearchThresholdAlertParams) =>
      sha256.create().update(JSON.stringify(params)).hex();

    const navigateToResults = async () => {
      const fetchedAlert = await fetchAlert();
      if (!fetchedAlert) {
        return;
      }

      if (getCurrentChecksum(fetchedAlert.params) !== checksum) {
        displayRuleChangedWarn(toastNotifications);
      }

      const fetchedSearchSource = await fetchSearchSource(fetchedAlert);
      if (!fetchedSearchSource) {
        return;
      }

      const index = fetchedSearchSource.getField('index');
      const state: DiscoverAppLocatorParams = {
        query: fetchedSearchSource.getField('query') || data.query.queryString.getDefaultQuery(),
        indexPatternId: index?.id,
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
