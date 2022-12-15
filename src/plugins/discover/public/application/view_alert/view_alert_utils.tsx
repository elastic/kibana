/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart, ToastsStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Rule } from '@kbn/alerting-plugin/common';
import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { ISearchSource, SerializedSearchSourceFields, getTime } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { MarkdownSimple, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { Filter } from '@kbn/es-query';
import { DiscoverAppLocatorParams } from '../../../common/locator';

export interface SearchThresholdAlertParams extends RuleTypeParams {
  searchConfiguration: SerializedSearchSourceFields;
}

export interface QueryParams {
  from: string | null;
  to: string | null;
}

const LEGACY_BASE_ALERT_API_PATH = '/api/alerts';

const buildTimeRangeFilter = (
  dataView: DataView,
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

export const getAlertUtils = (
  openActualAlert: boolean,
  queryParams: QueryParams,
  toastNotifications: ToastsStart,
  core: CoreStart,
  data: DataPublicPluginStart
) => {
  const showDataViewFetchError = (alertId: string) => {
    const errorTitle = i18n.translate('discover.viewAlert.dataViewErrorTitle', {
      defaultMessage: 'Error fetching data view',
    });
    toastNotifications.addDanger({
      title: errorTitle,
      text: toMountPoint(
        <MarkdownSimple>
          {new Error(`Data view failure of the alert rule with id ${alertId}.`).message}
        </MarkdownSimple>
      ),
    });
  };

  const fetchAlert = async (id: string) => {
    try {
      return await core.http.get<Rule<SearchThresholdAlertParams>>(
        `${LEGACY_BASE_ALERT_API_PATH}/alert/${id}`
      );
    } catch (error) {
      const errorTitle = i18n.translate('discover.viewAlert.alertRuleFetchErrorTitle', {
        defaultMessage: 'Error fetching alert rule',
      });
      toastNotifications.addDanger({
        title: errorTitle,
        text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
      });
      throw new Error(errorTitle);
    }
  };

  const fetchSearchSource = async (fetchedAlert: Rule<SearchThresholdAlertParams>) => {
    try {
      return {
        alert: fetchedAlert,
        searchSource: await data.search.searchSource.create(
          fetchedAlert.params.searchConfiguration
        ),
      };
    } catch (error) {
      const errorTitle = i18n.translate('discover.viewAlert.searchSourceErrorTitle', {
        defaultMessage: 'Error fetching search source',
      });
      toastNotifications.addDanger({
        title: errorTitle,
        text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
      });
      throw new Error(errorTitle);
    }
  };

  const buildLocatorParams = ({
    alert,
    searchSource,
  }: {
    alert: Rule<SearchThresholdAlertParams>;
    searchSource: ISearchSource;
  }): DiscoverAppLocatorParams => {
    const dataView = searchSource.getField('index');
    const timeFieldName = dataView?.timeFieldName;
    // data view fetch error
    if (!dataView || !timeFieldName) {
      showDataViewFetchError(alert.id);
      throw new Error('Data view fetch error');
    }

    const timeRange = openActualAlert
      ? { from: queryParams.from, to: queryParams.to }
      : buildTimeRangeFilter(dataView, alert, timeFieldName);

    return {
      query: searchSource.getField('query') || data.query.queryString.getDefaultQuery(),
      dataViewSpec: dataView.toSpec(false),
      timeRange,
      filters: searchSource.getField('filter') as Filter[],
    };
  };

  return {
    fetchAlert,
    fetchSearchSource,
    buildLocatorParams,
  };
};
