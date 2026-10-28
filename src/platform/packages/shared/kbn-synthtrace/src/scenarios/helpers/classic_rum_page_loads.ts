/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apm,
  createSeededRandom,
  type ApmFields,
  type SynthtraceGenerator,
  type Timerange,
} from '@kbn/synthtrace-client';
import { generatePerMinute } from './digital_experience_apps';

// The storefront is instrumented with both agents, so the apps list shows the two together
const CLASSIC_RUM_SERVICE_NAME = 'storefront-web';
const CLASSIC_RUM_PAGE_LOADS_PER_MINUTE = 3;
const CLASSIC_RUM_PAGES = ['/', '/products', '/products/:id', '/cart'] as const;
const CLASSIC_RUM_REQUESTS = ['GET /api/products', 'GET /api/cart', 'GET /api/recommendations'];

const MIN_PAGE_LOAD_MS = 800;
const MAX_PAGE_LOAD_MS = 3200;
const MIN_XHR_MS = 50;
const MAX_XHR_MS = 300;
// The XHR starts this far into the page load. The slowest XHR of the fastest page load still ends
// within it: 800 ms * (1 - 0.6) = 320 ms, which is more than the 300 ms of the slowest XHR.
const XHR_START_FRACTION = 0.6;

/** A whole number of milliseconds between `min` and `max`, inclusive. */
const sampleMs = (random: () => number, min: number, max: number): number =>
  min + Math.round(random() * (max - min));

/** Generates classic Elastic APM RUM page loads, each with one XHR span, ending at their tick. */
export const generateClassicRumPageLoads = (
  range: Timerange,
  { environment, scale, seed }: { environment: string; scale: number; seed: string }
): SynthtraceGenerator<ApmFields> => {
  const classicRum = apm.browser({
    serviceName: CLASSIC_RUM_SERVICE_NAME,
    environment,
    userAgent: apm.getChromeUserAgentDefaults(),
  });

  return generatePerMinute<ApmFields>(
    range,
    CLASSIC_RUM_PAGE_LOADS_PER_MINUTE * scale,
    ({ time, index }) => {
      const random = createSeededRandom(`${seed}:${CLASSIC_RUM_SERVICE_NAME}:${index}`);
      const pageLoadDuration = sampleMs(random, MIN_PAGE_LOAD_MS, MAX_PAGE_LOAD_MS);
      const requestName = CLASSIC_RUM_REQUESTS[index % CLASSIC_RUM_REQUESTS.length];
      // The page load ends at the tick, so that the last ones don't end after the range
      const start = time - pageLoadDuration;

      return classicRum
        .transaction({ transactionName: CLASSIC_RUM_PAGES[index % CLASSIC_RUM_PAGES.length] })
        .timestamp(start)
        .duration(pageLoadDuration)
        .success()
        .children(
          classicRum
            .span({ spanName: requestName, spanType: 'external', spanSubtype: 'http' })
            .timestamp(start + Math.round(pageLoadDuration * XHR_START_FRACTION))
            .duration(sampleMs(random, MIN_XHR_MS, MAX_XHR_MS))
            .success()
        );
    }
  );
};
