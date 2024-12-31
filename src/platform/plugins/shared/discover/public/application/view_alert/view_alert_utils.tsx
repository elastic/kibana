/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { CoreStart, ToastsStart } from '@kbn/core/public';
import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Rule } from '@kbn/alerting-plugin/common';
import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { ISearchSource, SerializedSearchSourceFields, getTime } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Markdown } from '@kbn/shared-ux-markdown';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Filter } from '@kbn/es-query';
import { DiscoverAppLocatorParams } from '../../../common/app_locator';

export interface SearchThresholdAlertParams extends RuleTypeParams {
  searchConfiguration: SerializedSearchSourceFields;
  esqlQuery?: AggregateQuery;
  timeField?: string;
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
  data: DataPublicPluginStart,
  dataViews: DataViewsPublicPluginStart
) => {
  const showDataViewFetchError = (alertId: string) => {
    const errorTitle = i18n.translate('discover.viewAlert.dataViewErrorTitle', {
      defaultMessage: 'Error fetching data view',
    });
    const errorText = i18n.translate('discover.viewAlert.dataViewErrorText', {
      defaultMessage: 'Data view failure of the alert rule with id {alertId}.',
      values: {
        alertId,
      },
    });
    toastNotifications.addDanger({
      title: errorTitle,
      text: errorText,
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
        text: toMountPoint(<Markdown readOnly>{error.message}</Markdown>, core),
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
        text: toMountPoint(<Markdown markdownContent={error.message} readOnly />, core),
      });
      throw new Error(errorTitle);
    }
  };

  const buildLocatorParams = async ({
    alert,
    searchSource,
  }: {
    alert: Rule<SearchThresholdAlertParams>;
    searchSource: ISearchSource;
  }): Promise<DiscoverAppLocatorParams> => {
    let dataView = searchSource.getField('index');
    let query = searchSource.getField('query') || data.query.queryString.getDefaultQuery();

    // Dataview and query for ES|QL alerts
    if (
      alert.params &&
      'esqlQuery' in alert.params &&
      alert.params.esqlQuery &&
      'esql' in alert.params.esqlQuery
    ) {
      query = alert.params.esqlQuery;
      const indexPattern: string = getIndexPatternFromESQLQuery(alert.params.esqlQuery.esql);
      dataView = await dataViews.create({
        title: indexPattern,
        timeFieldName: alert.params.timeField,
      });
    }

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
      query,
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
