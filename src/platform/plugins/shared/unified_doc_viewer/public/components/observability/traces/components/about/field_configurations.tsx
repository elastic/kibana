/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';

import { SERVICE_NAME, SPAN_DESTINATION_SERVICE_RESOURCE } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { ServiceNameLink } from '../service_name_link';
import { DependencyNameLink } from '../../doc_viewer_span_overview/sub_components/dependency_name_link';

// TODO This is currently kind of a duplication of what we have in:
// src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/resources/get_field_configuration.tsx
// src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/doc_viewer_span_overview/resources/get_span_field_configuration.tsx
// that will be removed once all the overview is changed

// TODO all missing configurations for span/transaction
export const aboutFieldConfigurations = {
  [SERVICE_NAME]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.serviceName.title', {
      defaultMessage: 'Service Name',
    }),
    formatter: (value: unknown, formattedValue: string) => (
      <ServiceNameLink
        serviceName={value as string}
        agentName={''} // {flattenedDoc[AGENT_NAME_FIELD]} TODO check how to get this
        formattedServiceName={formattedValue}
      />
    ), // TODO should I update the link to go to discover instead of APM? (same as the span links links)
  },
  [SPAN_DESTINATION_SERVICE_RESOURCE]: {
    title: i18n.translate(
      'unifiedDocViewer.observability.traces.spanDestinationServiceResource.title',
      {
        defaultMessage: 'Dependency',
      }
    ),
    formatter: (value: unknown, formattedValue: string) => (
      <DependencyNameLink
        dependencyName={value as string}
        spanType={''} // {flattenedDoc[SPAN_TYPE_FIELD]} TODO check how to get this
        spanSubtype={''} // {flattenedDoc[SPAN_SUBTYPE_FIELD]} TODO check how to get this
        environment={''} // {flattenedDoc[SERVICE_ENVIRONMENT_FIELD]} TODO check how to get this
        formattedDependencyName={formattedValue}
      />
    ), // TODO should I update the link to go to discover instead of APM? (same as the span links links)
  },
};
