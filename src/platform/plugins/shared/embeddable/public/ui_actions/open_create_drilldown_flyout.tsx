/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { type PresentationContainer } from '@kbn/presentation-containers';
import { openLazyFlyout } from '@kbn/presentation-util';
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
import React from 'react';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { HasDrilldowns } from '../drilldowns/types';
import { getDrilldownRegistryEntries, getDrilldownTriggers } from '../drilldowns/registry';
import { getEmbeddableTriggers } from './get_embeddable_triggers';
import { core } from '../kibana_services';
import { OPEN_CREATE_DRILLDOWN_FLYOUT_ACTION_ID, DRILLDOWN_ACTION_GROUP } from './constants';
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
  id: OPEN_CREATE_DRILLDOWN_FLYOUT_ACTION_ID,
  type: OPEN_CREATE_DRILLDOWN_FLYOUT_ACTION_ID,
  order: 12,
  getIconType: () => 'plusInCircle',
  grouping: [DRILLDOWN_ACTION_GROUP],
  getDisplayName: () =>
    i18n.translate('embeddableApi.createDrilldownAction.displayName', {
      defaultMessage: 'Create drilldown',
    }),
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
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
    const drilldownTriggers = await getDrilldownTriggers();
    return getEmbeddableTriggers(embeddable).some((trigger) => drilldownTriggers.includes(trigger));
  },
  execute: async (context: EmbeddableApiContext) => {
    const { embeddable } = context;
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    openLazyFlyout({
      core,
      parentApi: embeddable.parentApi,
      loadContent: async ({ closeFlyout }) => {
        const { DrilldownManager, getDrilldownFactories, getSiblingDrilldowns } = await import(
          '../drilldowns/drilldown_manager_ui'
        );
        const factories = await getDrilldownFactories(getDrilldownRegistryEntries());

        return (
          <DrilldownManager
            closeAfterCreate
            initialRoute={'/new'}
            drilldowns$={embeddable.drilldowns$}
            setDrilldowns={embeddable.setDrilldowns}
            setupContext={context}
            triggers={getEmbeddableTriggers(embeddable)}
            templates={getSiblingDrilldowns(embeddable)}
            onClose={closeFlyout}
            factories={factories}
          />
        );
      },
      flyoutProps: {
        'data-test-subj': 'createDrilldownFlyout',
        'aria-labelledby': 'drilldownFlyoutTitleAriaId',
        focusedPanelId: apiHasUniqueId(embeddable) ? embeddable.uuid : undefined,
      },
    });
  },
};
