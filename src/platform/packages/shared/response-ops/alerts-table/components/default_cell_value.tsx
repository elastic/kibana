/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps } from 'react';
import { isEmpty } from 'lodash';
import {
  ALERT_DURATION,
  AlertConsumers,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  ALERT_START,
  TIMESTAMP,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_PRODUCER,
} from '@kbn/rule-data-utils';
import { EuiBadge, EuiLink } from '@elastic/eui';
import { JsonValue } from '@kbn/utility-types';
import { AlertsTableSupportedConsumers, GetAlertsTableProp } from '../types';
import { alertProducersData, observabilityFeatureIds } from '../constants';
import { useFieldFormatter } from '../hooks/use_field_formatter';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

export const DefaultCellValue = ({
  alert,
  columnId,
}: Pick<ComponentProps<GetAlertsTableProp<'renderCellValue'>>, 'alert' | 'columnId'>) => {
  const {
    services: { fieldFormats, http },
  } = useAlertsTableContext();
  const formatField = useFieldFormatter(fieldFormats);
  const rawValue = alert[columnId];
  const value = extractFieldValue(rawValue);

  switch (columnId) {
    case TIMESTAMP:
    case ALERT_START:
      return <>{formatField('date')(value)}</>;

    case ALERT_RULE_NAME:
      if (!alert) {
        return <>{value}</>;
      }
      const ruleName = alert?.[ALERT_RULE_NAME]?.[0] as string | undefined;
      const ruleUuid = alert?.[ALERT_RULE_UUID]?.[0] as string | undefined;
      if (!ruleName || !ruleUuid) {
        return null;
      }
      return (
        <EuiLink
          href={http.basePath.prepend(
            `/app/management/insightsAndAlerting/triggersActions/rule/${ruleUuid}`
          )}
        >
          {ruleName}
        </EuiLink>
      );

    case ALERT_DURATION:
      return (
        <>
          {formatField('duration', {
            inputFormat: 'microseconds',
            outputFormat: 'humanizePrecise',
          })(value) || '--'}
        </>
      );

    case ALERT_RULE_CONSUMER:
      const producer = alert?.[ALERT_RULE_PRODUCER]?.[0] as AlertConsumers;
      const consumer = (
        observabilityFeatureIds.includes(producer)
          ? 'observability'
          : producer && (value === 'alerts' || value === 'stackAlerts' || value === 'discover')
          ? producer
          : value
      ) as AlertsTableSupportedConsumers;
      const consumerData = alertProducersData[consumer];
      if (!consumerData) {
        return <>{value}</>;
      }
      return <EuiBadge iconType={consumerData.icon}>{consumerData.displayName}</EuiBadge>;

    default:
      return <>{value}</>;
  }
};

/**
 * Extracts the value from the raw json ES field
 */
const extractFieldValue = (rawValue: string | JsonValue[]) => {
  const value = Array.isArray(rawValue) ? rawValue.join() : rawValue;

  if (!isEmpty(value)) {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }

  return '—';
};
