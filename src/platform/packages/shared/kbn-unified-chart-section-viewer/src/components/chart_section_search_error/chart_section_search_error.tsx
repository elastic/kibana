/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ErrorCallout, type ErrorCalloutProps } from '@kbn/discover-utils';
import { normalizeChartSectionSearchError } from '../../common/errors/normalize_chart_section_search_error';

export interface ChartSectionSearchErrorProps {
  error: unknown;
  title: string;
  isEsqlMode?: ErrorCalloutProps['isEsqlMode'];
  showErrorDialog?: ErrorCalloutProps['showErrorDialog'];
  esqlReferenceHref?: ErrorCalloutProps['esqlReferenceHref'];
}

/**
 * Chart-section fetch failures (METRICS_INFO, Traces, etc.) using Discover's ErrorCallout.
 * Host injects `showErrorDialog` and `esqlReferenceHref` — no Discover plugin context here.
 */
export const ChartSectionSearchError = ({
  error,
  title,
  isEsqlMode,
  showErrorDialog,
  esqlReferenceHref,
}: ChartSectionSearchErrorProps) => (
  <ErrorCallout
    title={title}
    error={normalizeChartSectionSearchError(error)}
    isEsqlMode={isEsqlMode}
    showErrorDialog={showErrorDialog}
    esqlReferenceHref={esqlReferenceHref}
  />
);
