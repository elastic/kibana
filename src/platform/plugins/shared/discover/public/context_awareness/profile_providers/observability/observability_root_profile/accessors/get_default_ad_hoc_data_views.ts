/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ObservabilityRootProfileProvider } from '../types';

const ALL_LOGS_DATA_VIEW_ID = 'discover-observability-root-profile-all-logs';

export const getDefaultAdHocDataViews: ObservabilityRootProfileProvider['profile']['getDefaultAdHocDataViews'] =

    (prev, { context }) =>
    () => {
      const prevDataViews = prev();

      if (!context.allLogsIndexPattern) {
        return prevDataViews;
      }

      return prevDataViews.concat({
        id: ALL_LOGS_DATA_VIEW_ID,
        name: i18n.translate('discover.observabilitySolution.allLogsDataViewName', {
          defaultMessage: 'All logs',
        }),
        title: context.allLogsIndexPattern,
        timeFieldName: '@timestamp',
      });
    };
