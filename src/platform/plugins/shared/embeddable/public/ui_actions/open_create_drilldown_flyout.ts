/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { PresentationContainer } from '@kbn/presentation-publishing';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasSupportedTriggers,
  apiIsOfType,
  getInheritedViewMode,
  type CanAccessViewMode,
  type EmbeddableApiContext,
  type HasUniqueId,
  type HasParentApi,
  type HasSupportedTriggers,
  type HasType,
  apiHasUniqueId,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { asyncForEach } from '@kbn/std';
import type { DrilldownRegistryEntry, HasDrilldowns } from '../drilldowns/types';
import { getDrilldownRegistryEntries } from '../drilldowns/registry';
import { getEmbeddableTriggers } from './get_embeddable_triggers';
import { core, isCompatibleLicense } from '../kibana_services';
import { OPEN_FLYOUT_ADD_DRILLDOWN, DRILLDOWN_ACTION_GROUP } from './constants';
import { apiHasDrilldowns } from '../drilldowns/api_has_drilldowns';

export type CreateDrilldownActionApi = CanAccessViewMode &
  Required<HasDrilldowns> &
  HasParentApi<HasType & Partial<PresentationContainer>> &
  HasSupportedTriggers &
  Partial<HasUniqueId>;

const isApiCompatible = (api: unknown | null): api is CreateDrilldownActionApi =>
  apiHasDrilldowns(api) &&
  apiHasParentApi(api) &&
  apiCanAccessViewMode(api) &&
  apiHasSupportedTriggers(api);

export const openCreateDrilldownFlyout: ActionDefinition<EmbeddableApiContext> = {
  id: OPEN_FLYOUT_ADD_DRILLDOWN,
  type: OPEN_FLYOUT_ADD_DRILLDOWN,
  order: 12,
  getIconType: () => 'plusInCircle',
  grouping: [DRILLDOWN_ACTION_GROUP],
  getDisplayName: () =>
    i18n.translate('embeddableApi.createDrilldownAction.displayName', {
      defaultMessage: 'Create drilldown',
    }),
  isCompatible: async (context: EmbeddableApiContext) => {
    const { embeddable } = context;
    if (!isApiCompatible(embeddable)) return false;
    if (
      getInheritedViewMode(embeddable) !== 'edit' ||
      !apiIsOfType(embeddable.parentApi, 'dashboard')
    )
      return false;

    /**
     * Check if there is an intersection between all registered drilldowns possible triggers that they could be attached to
     * and triggers that current embeddable supports
     */
    const drilldownTriggers = await getAllDrilldownTriggers(getDrilldownRegistryEntries(), context);
    return getEmbeddableTriggers(embeddable).some((trigger) => drilldownTriggers.includes(trigger));
  },
  execute: async (context: EmbeddableApiContext) => {
    const { embeddable } = context;
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    openLazyFlyout({
      core,
      parentApi: embeddable.parentApi,
      loadContent: async ({ closeFlyout }) => {
        const { getDrilldownManagerUi } = await import('../drilldowns/drilldown_manager_ui');
        return getDrilldownManagerUi({
          entries: getDrilldownRegistryEntries(),
          closeAfterCreate: true,
          initialRoute: '/new',
          drilldowns$: embeddable.drilldowns$,
          setDrilldowns: embeddable.setDrilldowns,
          setupContext: context,
          triggers: getEmbeddableTriggers(embeddable),
          onClose: closeFlyout,
        });
      },
      flyoutProps: {
        'data-test-subj': 'createDrilldownFlyout',
        'aria-labelledby': 'drilldownFlyoutTitleAriaId',
        focusedPanelId: apiHasUniqueId(embeddable) ? embeddable.uuid : undefined,
      },
    });
  },
};

export async function getAllDrilldownTriggers(entries: DrilldownRegistryEntry[], context: object) {
  const drilldownTriggers = new Set<string>();
  await asyncForEach(entries, async ([, drilldownGetFn]: DrilldownRegistryEntry) => {
    const { license, setup, supportedTriggers } = await drilldownGetFn();
    const isCompatible = setup.isCompatible ? setup.isCompatible(context) : true;
    if (isCompatible && (await isCompatibleLicense(license?.minimalLicense))) {
      supportedTriggers.forEach((trigger) => drilldownTriggers.add(trigger));
    }
  });
  return Array.from(drilldownTriggers);
}
