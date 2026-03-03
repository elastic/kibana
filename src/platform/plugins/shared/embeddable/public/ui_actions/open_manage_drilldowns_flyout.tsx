/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { PresentationContainer } from '@kbn/presentation-publishing';
import {
  apiCanAccessViewMode,
  apiHasSupportedTriggers,
  getInheritedViewMode,
  type CanAccessViewMode,
  type EmbeddableApiContext,
  type HasUniqueId,
  type HasParentApi,
  type HasSupportedTriggers,
  apiHasUniqueId,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import type { HasDrilldowns } from '../drilldowns/types';
import { DRILLDOWN_ACTION_GROUP, OPEN_FLYOUT_EDIT_DRILLDOWN } from './constants';
import { core } from '../kibana_services';
import { apiHasDrilldowns } from '../drilldowns/api_has_drilldowns';
import { getEmbeddableTriggers } from './get_embeddable_triggers';
import { getDrilldownRegistryEntries } from '../drilldowns/registry';

export type ManageDrilldownActionApi = CanAccessViewMode &
  HasDrilldowns &
  HasParentApi<Partial<PresentationContainer>> &
  HasSupportedTriggers &
  Partial<HasUniqueId>;

const isApiCompatible = (api: unknown | null): api is ManageDrilldownActionApi =>
  apiHasDrilldowns(api) && apiCanAccessViewMode(api) && apiHasSupportedTriggers(api);

const DISPLAY_NAME = i18n.translate('embeddableApi.manageDrilldownAction.displayName', {
  defaultMessage: 'Manage drilldowns',
});

export const openManageDrilldownsFlyout: ActionDefinition<EmbeddableApiContext> = {
  id: OPEN_FLYOUT_EDIT_DRILLDOWN,
  type: OPEN_FLYOUT_EDIT_DRILLDOWN,
  order: 10,
  getIconType: () => 'list',
  grouping: [DRILLDOWN_ACTION_GROUP],
  getDisplayName: () => DISPLAY_NAME,
  MenuItem: ({ context }: { context: EmbeddableApiContext }) => {
    const drilldowns = useStateFromPublishingSubject(
      (context.embeddable as HasDrilldowns).drilldowns$
    );

    const count = useMemo(() => {
      return (drilldowns ?? []).length;
    }, [drilldowns]);

    return (
      <EuiFlexGroup alignItems={'center'}>
        <EuiFlexItem grow={true}>{DISPLAY_NAME}</EuiFlexItem>
        {count > 0 && (
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge>{count}</EuiNotificationBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  },
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable) || getInheritedViewMode(embeddable) !== 'edit') return false;
    return (embeddable.drilldowns$.getValue() ?? []).length > 0;
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
          initialRoute: '/manage',
          drilldowns$: embeddable.drilldowns$,
          setDrilldowns: embeddable.setDrilldowns,
          setupContext: context,
          triggers: getEmbeddableTriggers(embeddable),
          onClose: closeFlyout,
        });
      },
      flyoutProps: {
        'data-test-subj': 'editDrilldownFlyout',
        'aria-labelledby': 'drilldownFlyoutTitleAriaId',
        focusedPanelId: apiHasUniqueId(embeddable) ? embeddable.uuid : undefined,
      },
    });
  },
};
