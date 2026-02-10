/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncMap } from '@kbn/std';
import type { DrilldownRegistryEntry } from '../types';
import type { DrilldownFactory } from './types';
import { isCompatibleLicense } from '../../kibana_services';

export async function getDrilldownFactories(
  entries: DrilldownRegistryEntry[]
): Promise<DrilldownFactory[]> {
  return asyncMap(entries, async ([type, getDrilldownDefinition]) => {
    const drilldownDefinition = await getDrilldownDefinition();
    return {
      type,
      isLicenseCompatible: await isCompatibleLicense(drilldownDefinition.license?.minimalLicense),
      displayName: drilldownDefinition.displayName,
      euiIcon: drilldownDefinition.euiIcon,
      supportedTriggers: drilldownDefinition.supportedTriggers,
      ...drilldownDefinition.setup,
      order: drilldownDefinition.setup.order ?? 0,
    };
  });
}
