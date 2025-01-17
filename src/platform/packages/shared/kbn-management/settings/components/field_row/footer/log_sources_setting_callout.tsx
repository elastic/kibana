/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useServices } from '../services';

const LOG_SOURCES_NOT_USED_BY_RULES = i18n.translate(
  'management.settings.field.logSources.notUsedByRulesTitle',
  {
    defaultMessage: 'Alerting rules now use data view',
  }
);

export const LogSourcesSettingCallout = () => {
  const { getDataViewLink } = useServices();
  const viewDataViewLink = getDataViewLink?.(
    '/app/management/kibana/dataViews/dataView/log_rules_data_view'
  );

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        data-test-subj="logSourcesWarningCalloutNotUsedByRules"
        size="s"
        title={LOG_SOURCES_NOT_USED_BY_RULES}
        color="warning"
        iconType="warning"
      >
        <FormattedMessage
          id="management.settings.field.logSources.notUsedByRulesMessage"
          defaultMessage="If you intend to change data source of the Log threshold rules, please update the data view."
        />
        <EuiSpacer size="s" />
        <EuiLink
          data-test-subj="logSourcesViewDataViewLink"
          href={viewDataViewLink || ''}
          target="_blank"
        >
          <FormattedMessage
            id="management.settings.field.logSources.viewDataViewLink"
            defaultMessage="View data view"
          />
        </EuiLink>
      </EuiCallOut>
    </>
  );
};
