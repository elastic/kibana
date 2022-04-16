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
import type { Rule } from '@kbn/alerting-plugin/common';
import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { MarkdownSimple, toMountPoint } from '@kbn/kibana-react-plugin/public';

export interface SearchThresholdAlertParams extends RuleTypeParams {
  searchConfiguration: SerializedSearchSourceFields;
}

export interface QueryParams {
  from: string | null;
  to: string | null;
  checksum: string | null;
}

const LEGACY_BASE_ALERT_API_PATH = '/api/alerts';

export const getAlertUtils = (
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

  const displayRuleChangedWarn = () => {
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

  const displayPossibleDocsDiffInfoAlert = () => {
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
    }
  };

  const fetchSearchSource = async (fetchedAlert: Rule<SearchThresholdAlertParams>) => {
    try {
      return await data.search.searchSource.create(fetchedAlert.params.searchConfiguration);
    } catch (error) {
      const errorTitle = i18n.translate('discover.viewAlert.searchSourceErrorTitle', {
        defaultMessage: 'Error fetching search source',
      });
      toastNotifications.addDanger({
        title: errorTitle,
        text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
      });
    }
  };

  return {
    displayRuleChangedWarn,
    displayPossibleDocsDiffInfoAlert,
    showDataViewFetchError,
    fetchAlert,
    fetchSearchSource,
  };
};
