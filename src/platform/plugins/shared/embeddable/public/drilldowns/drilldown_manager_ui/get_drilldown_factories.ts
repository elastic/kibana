/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncForEach } from '@kbn/std';
import type { DrilldownRegistryEntry } from '../types';
import type { DrilldownFactory } from './types';
import { isCompatibleLicense } from '../../kibana_services';

export async function getDrilldownFactories(
  entries: DrilldownRegistryEntry[],
  context: object
): Promise<DrilldownFactory[]> {
  const factories: DrilldownFactory[] = [];
  await asyncForEach(entries, async ([type, getDrilldownDefinition]) => {
    const { displayName, euiIcon, license, setup, supportedTriggers } =
      await getDrilldownDefinition();
    const isCompatible = setup.isCompatible ? setup.isCompatible(context) : true;
    if (isCompatible) {
      factories.push({
        type,
        isLicenseCompatible: await isCompatibleLicense(license?.minimalLicense),
        displayName,
        euiIcon,
        supportedTriggers,
        ...setup,
        order: setup.order ?? 0,
      });
    }
  });
  return factories;
}
