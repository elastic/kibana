/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasUniqueId,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasParentApi,
  HasUniqueId,
} from '@kbn/presentation-publishing';
import { createAction, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiHasVisualizeConfig, HasVisualizeConfig, Vis } from '@kbn/visualizations-plugin/public';
import type { InputControlVisParams } from '../types';

export const ACTION_CONVERT_TO_CONTROLS = 'ACTION_CONVERT_TO_CONTROLS';

const displayName = i18n.translate('inputControl.actions.convertToControls.displayName', {
  defaultMessage: 'Convert to Controls',
});

const MenuItem: React.FC = () => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>{displayName}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={'accent'}>
          {i18n.translate('inputControl.tonNavMenu.tryItBadgeText', {
            defaultMessage: 'Try it',
          })}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

type ActionApi = HasUniqueId & HasVisualizeConfig & CanAccessViewMode & HasParentApi;

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']): api is ActionApi =>
  apiHasUniqueId(api) &&
  apiCanAccessViewMode(api) &&
  apiHasVisualizeConfig(api) &&
  apiHasParentApi(api);

export const convertToControlsAction = createAction<EmbeddableApiContext>({
  id: ACTION_CONVERT_TO_CONTROLS,
  type: ACTION_CONVERT_TO_CONTROLS,
  order: 100,
  getDisplayName: () => displayName,
  MenuItem,
  getIconType: () => 'merge',
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    return (
      compatibilityCheck(embeddable) &&
      embeddable.getVis().type?.name === 'input_control_vis' &&
      getInheritedViewMode(embeddable) === ViewMode.EDIT
    );
  },
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    const { addToControls } = await import('./add_to_controls');
    addToControls(embeddable.parentApi.controlGroup, embeddable.getVis() as unknown as Vis<InputControlVisParams>);
  },
  showNotification: true,
});
