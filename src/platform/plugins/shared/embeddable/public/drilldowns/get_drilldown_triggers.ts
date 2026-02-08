/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncForEach } from '@kbn/std';
import type { DrilldownDefinition } from './types';
import { isCompatibleLicense } from '../kibana_services';

export async function getDrilldownTriggers(
  drilldownGetFns: Array<() => Promise<DrilldownDefinition>>
) {
  const drilldownTriggers = new Set<string>();
  await asyncForEach(
    drilldownGetFns,
    async (drilldownGetFn: () => Promise<DrilldownDefinition>) => {
      const { license, supportedTriggers } = await drilldownGetFn();
      if (await isCompatibleLicense(license?.minimalLicense)) {
        supportedTriggers.forEach((trigger) => drilldownTriggers.add(trigger));
      }
    }
  );
  return Array.from(drilldownTriggers);
}
