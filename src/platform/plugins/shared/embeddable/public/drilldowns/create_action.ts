/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import type { LicenseType } from '@kbn/licensing-types';
import { getDrilldownDefinition, hasDrilldownDefinition } from './registry';
import { licensing, uiActions } from '../kibana_services';
import type { DrilldownStateInternal } from './types';

async function isCompatibleLicense(minimalLicense?: LicenseType) {
  if (!minimalLicense || !licensing) return true;
  const license = await licensing?.getLicense();
  return license.isAvailable && license.isActive && license.hasAtLeast(minimalLicense);
}

export function createAction(embeddableUuid: string, drilldownState: DrilldownStateInternal) {
  const { actionId, triggers, type } = drilldownState;

  if (!hasDrilldownDefinition(type)) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unable to create action for drilldown. Drilldown type not registered for [type = ${type}].`
    );
    return;
  }

  uiActions.registerActionAsync(actionId, async () => ({
    id: actionId,
    execute: async (context: EmbeddableApiContext) => {
      const { execute, licenseFeatureName, minimalLicense } =
        (await getDrilldownDefinition(type)) ?? {};

      if (minimalLicense && licenseFeatureName && licensing) {
        licensing.featureUsage.notifyUsage(licenseFeatureName).catch(() => {
          // eslint-disable-next-line no-console
          console.warn(`Drilldown [type = ${type}] fail notify feature usage.`);
        });
      }

      execute(drilldownState, context);
    },
    isCompatible: async (context: EmbeddableApiContext) => {
      const { embeddable } = context;
      if (!apiHasUniqueId(embeddable) || embeddable.uuid !== embeddableUuid) {
        return false;
      }

      const { minimalLicense, isCompatible } = (await getDrilldownDefinition(type)) ?? {};

      if (!(await isCompatibleLicense(minimalLicense))) return false;

      return isCompatible ? await isCompatible(context) : true;
    },
  }));

  triggers.forEach((trigger) => uiActions.attachAction(trigger, actionId));
}
