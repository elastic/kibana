/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';

import { i18n } from '@kbn/i18n';
import { ContentFrameworkSection } from '../../../../content_framework/section';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

const logsTitle = i18n.translate('unifiedDocViewer.observability.traces.section.logs.title', {
  defaultMessage: 'Logs',
});

const logsDescription = i18n.translate(
  'unifiedDocViewer.observability.traces.section.logs.description',
  {
    defaultMessage: 'View logs related to this document.',
  }
);

export function Logs() {
  const { discoverShared, data: dataService, uiSettings } = getUnifiedDocViewerServices();

  const { from: start, to: end } = dataService.query.timefilter.timefilter.getTime();

  console.log('dataService', dataService);
  const logsOverviewFeature = discoverShared.features.registry.getById(
    'observability-logs-overview'
  );

  const kuery = 'span.id: *';

  console.log('kuery', kuery);
  const timeRange = useMemo(() => ({ start, end }), [start, end]);

  const LogsOverview = logsOverviewFeature?.getLogsOverview();

  const logFilters = useMemo(() => {
    return [
      buildEsQuery(
        undefined,
        {
          language: 'kuery',
          query: kuery,
        },
        [],
        getEsQueryConfig(uiSettings)
      ),
    ];
  }, [kuery, uiSettings]);

  console.log('logFilters', logFilters);
  if (!LogsOverview || !logFilters) {
    return null;
  }

  return (
    <ContentFrameworkSection
      title={logsTitle}
      description={logsDescription}
      id="id"
      children={
        <LogsOverview
          timeRange={timeRange}
          documentFilters={logFilters}
          height="50vh"
          featureFlags={{ isPatternsEnabled: false, test: false }}
        />
      }
    />
  );
}
