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
import { createElement } from 'react';
import { getDrilldown, hasDrilldown } from './registry';
import { isCompatibleLicense, licensing, uiActions } from '../kibana_services';
import type { DrilldownActionState } from './types';

export function createAction(embeddableUuid: string, drilldownState: DrilldownActionState) {
  const { actionId, label, trigger, type } = drilldownState;

  if (!hasDrilldown(type)) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unable to create action for drilldown. Drilldown type not registered for [type = ${type}].`
    );
    return;
  }

  uiActions.addTriggerActionAsync(trigger, actionId, async () => {
    const {
      action: { execute, getHref, isCompatible, MenuItem },
      euiIcon,
      license,
    } = (await getDrilldown(type)) ?? {};

    return {
      id: actionId,
      type,
      getDisplayName: () => label,
      getIconType: () => euiIcon,
      ...(getHref
        ? {
            getHref: async (context: EmbeddableApiContext) => {
              return getHref(drilldownState, context);
            },
          }
        : {}),
      execute: async (context: EmbeddableApiContext) => {
        if (license && licensing) {
          licensing.featureUsage.notifyUsage(license.featureName).catch(() => {
            // eslint-disable-next-line no-console
            console.warn(`Drilldown [type = ${type}] fail notify feature usage.`);
          });
        }

        await execute(drilldownState, context);
      },
      isCompatible: async (context: EmbeddableApiContext) => {
        const { embeddable } = context;
        if (!apiHasUniqueId(embeddable) || embeddable.uuid !== embeddableUuid) {
          return false;
        }

        if (!(await isCompatibleLicense(license?.minimalLicense))) return false;

        return isCompatible ? isCompatible(drilldownState, context) : true;
      },
      ...(MenuItem
        ? {
            MenuItem: ({ context }) => createElement(MenuItem, { context, drilldownState }),
          }
        : {}),
    };
  });
}
