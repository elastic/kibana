/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  getViewModeSubject,
} from '@kbn/presentation-publishing';
import { Action } from '@kbn/ui-actions-plugin/public';
import { apiHasVisualizeConfig, HasVisualizeConfig } from '@kbn/visualizations-plugin/public';

export const ACTION_DEPRECATION_BADGE = 'ACTION_INPUT_CONTROL_DEPRECATION_BADGE';

export type InputControlDeprecationActionApi = CanAccessViewMode & HasVisualizeConfig;

export const isApiCompatible = (api: unknown | null): api is InputControlDeprecationActionApi =>
  Boolean(apiCanAccessViewMode(api) && apiHasVisualizeConfig(api));

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']) => {
  if (
    isApiCompatible(api) &&
    getInheritedViewMode(api) === ViewMode.EDIT &&
    api.getVis().type.name === 'input_control_vis'
  )
    return true;

  return false;
};

export class InputControlDeprecationBadge implements Action<EmbeddableApiContext> {
  public id = ACTION_DEPRECATION_BADGE;
  public type = ACTION_DEPRECATION_BADGE;
  public disabled = true;

  public getDisplayName() {
    return i18n.translate('inputControl.deprecationBadgeAction.deprecationBadgeLabel', {
      defaultMessage: 'Deprecated',
    });
  }

  public getIconType() {
    return 'warning';
  }

  public getDisplayNameTooltip() {
    return i18n.translate('inputControl.deprecationBadgeAction.deprecationWarningDescription', {
      defaultMessage:
        'Input controls are deprecated and will be removed in a future release. Use the new Controls to filter and interact with your dashboard data.',
    });
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return compatibilityCheck(embeddable);
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public subscribeToCompatibilityChanges(
    { embeddable }: EmbeddableApiContext,
    onChange: (isCompatible: boolean, action: Action<EmbeddableApiContext>) => void
  ) {
    if (!isApiCompatible(embeddable)) return;
    return getViewModeSubject(embeddable)?.subscribe(() => {
      onChange(compatibilityCheck(embeddable), this);
    });
  }

  public async execute() {
    // do nothing
    return;
  }
}
