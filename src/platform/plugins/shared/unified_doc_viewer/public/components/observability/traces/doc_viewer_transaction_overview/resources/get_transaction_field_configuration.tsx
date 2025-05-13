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
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiText } from '@elastic/eui';
import {
  FieldConfiguration,
  getCommonFieldConfiguration,
} from '../../resources/get_field_configuration';

export const getTransactionFieldConfiguration = (
  attributes: TraceDocumentOverview
): Record<string, FieldConfiguration> => {
  return {
    ...getCommonFieldConfiguration(attributes),
    [USER_AGENT_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.userAgent.title', {
        defaultMessage: 'User agent',
      }),
      content: (value) => <EuiText size="xs">{value}</EuiText>,
      value: attributes[USER_AGENT_NAME_FIELD],
    },
    [USER_AGENT_VERSION_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.details.userAgentVersion.title',
        {
          defaultMessage: 'User agent version',
        }
      ),
      content: (value) => <EuiText size="xs">{value}</EuiText>,
      value: attributes[USER_AGENT_VERSION_FIELD],
    },
  };
};
