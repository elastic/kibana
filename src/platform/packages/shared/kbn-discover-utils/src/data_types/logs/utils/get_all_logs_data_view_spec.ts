/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const ALL_LOGS_DATA_VIEW_ID = 'discover-observability-solution-all-logs';

export const getAllLogsDataViewSpec = ({
  allLogsIndexPattern,
}: {
  allLogsIndexPattern: string;
}) => ({
  id: ALL_LOGS_DATA_VIEW_ID,
  name: i18n.translate('discover.observabilitySolution.allLogsDataViewName', {
    defaultMessage: 'All logs',
  }),
  title: allLogsIndexPattern,
  timeFieldName: '@timestamp',
});
