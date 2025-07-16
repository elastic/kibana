/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  getViewModeSubject,
} from '@kbn/presentation-publishing';
import { apiHasVisualizeConfig, HasVisualizeConfig } from '@kbn/visualizations-plugin/public';

import { map } from 'rxjs';
import { INPUT_CONTROL_VIS_TYPE } from './input_control_vis_type';

const ACTION_DEPRECATION_BADGE = 'ACTION_INPUT_CONTROL_DEPRECATION_BADGE';

type InputControlDeprecationActionApi = CanAccessViewMode & HasVisualizeConfig;

const isApiCompatible = (api: unknown | null): api is InputControlDeprecationActionApi =>
  Boolean(apiCanAccessViewMode(api) && apiHasVisualizeConfig(api));

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']) => {
  return (
    isApiCompatible(api) &&
    getInheritedViewMode(api) === 'edit' &&
    api.getVis().type.name === INPUT_CONTROL_VIS_TYPE
  );
};

export const inputControlDeprecationBadge = {
  id: ACTION_DEPRECATION_BADGE,
  type: ACTION_DEPRECATION_BADGE,
  disabled: true,

  getDisplayName: () =>
    i18n.translate('inputControl.deprecationBadgeAction.deprecationBadgeLabel', {
      defaultMessage: 'Deprecated',
    }),

  getIconType: () => 'warning',

  getDisplayNameTooltip: () =>
    i18n.translate('inputControl.deprecationBadgeAction.deprecationWarningDescription', {
      defaultMessage:
        'Input controls are deprecated and will be removed in a future release. Use the new Controls to filter and interact with your dashboard data.',
    }),

  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    return compatibilityCheck(embeddable);
  },

  couldBecomeCompatible: ({ embeddable }: EmbeddableApiContext) => {
    return isApiCompatible(embeddable) && embeddable.getVis().type.name === INPUT_CONTROL_VIS_TYPE;
  },

  getCompatibilityChangesSubject: ({ embeddable }: EmbeddableApiContext) => {
    return isApiCompatible(embeddable)
      ? getViewModeSubject(embeddable)?.pipe(map(() => undefined))
      : undefined;
  },

  execute: async () => {
    // do nothing
  },
};
