/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-server-internal';
import type { Logger } from '@kbn/logging';

import { CoreKibanaRequest, buildDeprecations } from '@kbn/core-http-router-server-internal';

interface Dependencies {
  logRouteApiDeprecations: boolean; // TODO(jloleysens) use this
  log: Logger;
  coreUsageData: InternalCoreUsageDataSetup;
}

export function createRouteDeprecationsHandler({ coreUsageData }: Dependencies) {
  return (req: CoreKibanaRequest) => {
    const {
      route: {
        options: { deprecated: deprecatedInput },
      },
    } = req;
    const messages: string[] = [];
    if (typeof deprecatedInput === 'boolean' && deprecatedInput === true) {
      // Log route level deprecation
      messages.push(`${req.route.method} ${req.route.path} is deprecated.`);
    } else if (typeof deprecatedInput === 'string') {
      // Log route level deprecation + message
      messages.push(deprecatedInput);
    } else if (typeof deprecatedInput === 'object') {
      // Log route input level deprecation + message
      const deprecations = buildDeprecations(deprecatedInput);
      for (const { check, message, location } of deprecations) {
        if (check(req[location])) messages.push(`${req.route.method} ${req.route.path} ${message}`);
      }
    }
    for (const message of messages) {
      coreUsageData.incrementUsageCounter({ counterName: message }); // TODO(jloleysens) figure this part out
    }
  };
}
