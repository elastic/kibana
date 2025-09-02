/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';

import { TRACE_ID, TRANSACTION_ID } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { TraceIdLink } from '../trace_id_link';

// TODO This is currently kind of a duplication of what we have in:
// src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/resources/get_field_configuration.tsx
// that will be removed once all the overview is changed

export const traceFieldConfigurations = {
  [TRACE_ID]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.traceId.title', {
      defaultMessage: 'Trace ID',
    }),
    formatter: (value: unknown, formattedValue: string) => (
      <TraceIdLink traceId={value as string} formattedTraceId={formattedValue} />
    ), // TODO should I update the link to go to discover instead of APM? (same as the span links links)
  },
  [TRANSACTION_ID]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.transactionId.title', {
      defaultMessage: 'Transaction ID',
    }), // TODO check if we want a formatter in here too or not, do I want to add a link to Discover as similar spans?
  },
};
