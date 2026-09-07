/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ErrorCallout } from '@kbn/discover-utils';
import { normalizeChartSectionSearchError } from '../../common/errors/normalize_chart_section_search_error';
import { useExternalServices } from '../../context/external_services';

export interface ChartSectionSearchErrorProps {
  error: unknown;
  title: string;
}

/**
 * Chart-section fetch failures (METRICS_INFO, Traces, etc.) using Discover's ErrorCallout.
 * Host injects notifications and doc links via `ExternalServicesProvider`.
 */
export const ChartSectionSearchError = ({ error, title }: ChartSectionSearchErrorProps) => {
  const services = useExternalServices();

  return (
    <ErrorCallout
      title={title}
      error={normalizeChartSectionSearchError(error)}
      isEsqlMode
      showErrorDialog={services?.notifications?.showErrorDialog}
      esqlReferenceHref={services?.docLinks?.links.query.queryESQL}
    />
  );
};
