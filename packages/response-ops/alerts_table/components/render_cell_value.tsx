/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { isEmpty } from 'lodash';
import {
  ALERT_DURATION,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  ALERT_START,
  TIMESTAMP,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_PRODUCER,
} from '@kbn/rule-data-utils';
import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { EuiBadge, EuiLink } from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { AlertsTableProps } from '../types';
import { alertProducersData, observabilityFeatureIds } from '../constants';
import { AlertsTableSupportedConsumers } from '../types';

export const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: any[];
  fieldName: string;
}): string[] | undefined => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};

const getRenderValue = (mappedNonEcsValue: any) => {
  const value = Array.isArray(mappedNonEcsValue) ? mappedNonEcsValue.join() : mappedNonEcsValue;

  if (!isEmpty(value)) {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }

  return '—';
};

export const renderCellValue: AlertsTableProps['renderCellValue'] = (props) => {
  const { columnId, data, fieldFormats, http } = props;
  const alertValueFormatter = getAlertFormatters(fieldFormats, http);
  const rawValue = props.alert[columnId]?.[0];
  const value = getRenderValue(rawValue);
  return alertValueFormatter(columnId, value, data);
};

const defaultParam: Record<string, FieldFormatParams> = {
  duration: {
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
  },
  number: {
    pattern: '00.00',
  },
};

export const getFieldFormatterProvider =
  (fieldFormats: FieldFormatsStart) => (fieldType: string, params?: FieldFormatParams) => {
    const fieldFormatter = fieldFormats.deserialize({
      id: fieldType,
      params: params ?? defaultParam[fieldType],
    });
    return fieldFormatter.convert.bind(fieldFormatter);
  };

const AlertRuleLink = ({
  alertFields,
  http,
}: {
  alertFields: Array<{ field: string; value: any }>;
  http: HttpStart;
}) => {
  const ruleName = alertFields.find((f) => f.field === ALERT_RULE_NAME)?.value?.[0];
  const ruleUuid = alertFields.find((f) => f.field === ALERT_RULE_UUID)?.value?.[0];

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
};

export function getAlertFormatters(fieldFormats: FieldFormatsStart, http: HttpStart) {
  const getFormatter = getFieldFormatterProvider(fieldFormats);

  return (
    columnId: string,
    value: any,
    rowData?: Array<{ field: string; value: any }>
  ): React.ReactElement => {
    switch (columnId) {
      case TIMESTAMP:
      case ALERT_START:
        return <>{getFormatter('date')(value)}</>;
      case ALERT_RULE_NAME:
        return rowData ? <AlertRuleLink alertFields={rowData} http={http} /> : <>{value}</>;
      case ALERT_DURATION:
        return (
          <>
            {getFormatter('duration', {
              inputFormat: 'microseconds',
              outputFormat: 'humanizePrecise',
            })(value) || '--'}
          </>
        );
      case ALERT_RULE_CONSUMER:
        const producer = rowData?.find(({ field }) => field === ALERT_RULE_PRODUCER)?.value?.[0];
        const consumer: AlertsTableSupportedConsumers = observabilityFeatureIds.includes(producer)
          ? 'observability'
          : producer && (value === 'alerts' || value === 'stackAlerts' || value === 'discover')
          ? producer
          : value;
        const consumerData = alertProducersData[consumer];
        if (!consumerData) {
          return <>{value}</>;
        }
        return <EuiBadge iconType={consumerData.icon}>{consumerData.displayName}</EuiBadge>;
      default:
        return <>{value}</>;
    }
  };
}

export type RegisterFormatter = ReturnType<typeof getAlertFormatters>;
