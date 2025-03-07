/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAllLogsDataViewSpec } from '@kbn/discover-utils/src';
import type { ObservabilityRootProfileProvider } from '../types';

export const getDefaultAdHocDataViews: ObservabilityRootProfileProvider['profile']['getDefaultAdHocDataViews'] =

    (prev, { context }) =>
    () => {
      const prevDataViews = prev();

      if (!context.allLogsIndexPattern) {
        return prevDataViews;
      }

      return prevDataViews.concat(
        getAllLogsDataViewSpec({ allLogsIndexPattern: context.allLogsIndexPattern })
      );
    };
