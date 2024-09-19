/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnPostAuthHandler } from '@kbn/core-http-server';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-server-internal';
import type { Logger } from '@kbn/logging';

import { findInputDeprecations } from './find_deprecations';

interface Dependencies {
  log: Logger;
  coreUsageData: InternalCoreUsageDataSetup;
}

export function createRouteDeprecationsHandler({ coreUsageData }: Dependencies): OnPostAuthHandler {
  return (req, res, toolkit) => {
    const {
      route: {
        options: { deprecated },
      },
    } = req;
    const messages = [];
    if (typeof deprecated === 'boolean' && deprecated === true) {
      // Log route level deprecation
    } else if (typeof deprecated === 'string') {
      // Log route level deprecation + message
    } else if (typeof deprecated === 'object') {
      messages.push(...findInputDeprecations(req, deprecated() /* TODO */));
      // Log route input level deprecation + message
    }
    for (const message of messages) {
      coreUsageData.incrementUsageCounter({
        counterName: `[${req.route.method}]${req.route.path} ${message}`,
      });
    }
    return toolkit.next();
  };
}
