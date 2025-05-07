/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  USER_AGENT_NAME_FIELD,
  TraceDocumentOverview,
  USER_AGENT_VERSION_FIELD,
  DataTableRecord,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  FieldConfiguration,
  getCommonFieldConfiguration,
} from '../../resources/get_field_configuration';
import { HighlightField } from '../../components/highlight_field.tsx';
import { getTraceDocValue } from '../../resources/get_field_value';

export const getTransactionFieldConfiguration = ({
  attributes,
  flattenedDoc,
}: {
  attributes: TraceDocumentOverview;
  flattenedDoc: DataTableRecord['flattened'];
}): Record<string, FieldConfiguration> => {
  return {
    ...getCommonFieldConfiguration({ attributes, flattenedDoc }),
    [USER_AGENT_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.userAgent.title', {
        defaultMessage: 'User agent',
      }),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue} />
      ),
      value: getTraceDocValue(USER_AGENT_NAME_FIELD, flattenedDoc),
      formattedValue: attributes[USER_AGENT_NAME_FIELD],
    },
    [USER_AGENT_VERSION_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.details.userAgentVersion.title',
        {
          defaultMessage: 'User agent version',
        }
      ),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue} />
      ),
      value: getTraceDocValue(USER_AGENT_VERSION_FIELD, flattenedDoc),
      formattedValue: attributes[USER_AGENT_VERSION_FIELD],
    },
  };
};
