/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SPAN_NAME_FIELD,
  SPAN_DESTINATION_SERVICE_RESOURCE_FIELD,
  SERVICE_ENVIRONMENT_FIELD,
  SPAN_SUBTYPE_FIELD,
  SPAN_TYPE_FIELD,
  SpanDocumentOverview,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiBadge, EuiText } from '@elastic/eui';
import { DependencyNameLink } from '../sub_components/dependency_name_link';
import {
  FieldConfiguration,
  getCommonFieldConfiguration,
} from '../../resources/get_field_configuration';

export const getSpanFieldConfiguration = (
  attributes: SpanDocumentOverview
): Record<string, FieldConfiguration> => {
  return {
    ...getCommonFieldConfiguration(attributes),
    [SPAN_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.spanName.title', {
        defaultMessage: 'Span name',
      }),
      content: (value) => <EuiText size="xs">{value}</EuiText>,
      value: attributes[SPAN_NAME_FIELD],
    },
    [SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.details.spanDestinationServiceResource.title',
        {
          defaultMessage: 'Dependency',
        }
      ),
      content: (value) => (
        <DependencyNameLink
          dependencyName={value as string}
          environment={attributes[SERVICE_ENVIRONMENT_FIELD]}
        />
      ),
      value: attributes[SPAN_DESTINATION_SERVICE_RESOURCE_FIELD],
      fieldMetadata: {
        flat_name: 'span.destination.service.resource',
      },
    },
    [SPAN_TYPE_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.spanType.title', {
        defaultMessage: 'Type',
      }),
      content: (value) => <EuiBadge color="hollow">{value}</EuiBadge>,
      value: attributes[SPAN_TYPE_FIELD],
    },
    [SPAN_SUBTYPE_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.spanSubtype.title', {
        defaultMessage: 'Subtype',
      }),
      content: (value) => <EuiBadge color="hollow">{value}</EuiBadge>,
      value: attributes[SPAN_SUBTYPE_FIELD],
    },
  };
};
