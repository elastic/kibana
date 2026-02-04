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
import { getDrilldown, hasDrilldown } from './registry';
import { licensing, uiActions } from '../kibana_services';
import type { DrilldownStateInternal } from './types';

async function isCompatibleLicense(minimalLicense?: LicenseType) {
  if (!minimalLicense || !licensing) return true;
  const license = await licensing?.getLicense();
  return license.isAvailable && license.isActive && license.hasAtLeast(minimalLicense);
}

export function createAction(embeddableUuid: string, drilldownState: DrilldownStateInternal) {
  const { actionId, label, trigger, type } = drilldownState;

  if (!hasDrilldown(type)) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unable to create action for drilldown. Drilldown type not registered for [type = ${type}].`
    );
    return;
  }

  uiActions.addTriggerActionAsync(actionId, trigger, async () => {
    const { execute, euiIcon, isCompatible, license } = (await getDrilldown(type)) ?? {};
    return {
      id: actionId,
      getDisplayName: () => label,
      getIconType: () => euiIcon,
      execute: async (context: EmbeddableApiContext) => {
        if (license && licensing) {
          licensing.featureUsage.notifyUsage(license.featureName).catch(() => {
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

        if (!(await isCompatibleLicense(license?.minimalLicense))) return false;

        return isCompatible ? isCompatible(context) : true;
      },
    };
  });
}
