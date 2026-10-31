/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import type {
  EmbeddableApiContext,
  HasParentApi,
  HasUniqueId,
  PublishesViewMode,
  PresentationContainer,
} from '@kbn/presentation-publishing';
import {
  apiCanAccessViewMode,
  apiHasType,
  apiHasUniqueId,
  getInheritedViewMode,
  getContainerParentFromAPI,
} from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { usageCollection } from '../../kibana_services';
import { ACTION_REMOVE_PANEL } from './constants';

export type RemovePanelActionApi = PublishesViewMode &
  HasUniqueId &
  HasParentApi<PresentationContainer>;

const isApiCompatible = (api: unknown | null): api is RemovePanelActionApi =>
  Boolean(apiHasUniqueId(api) && apiCanAccessViewMode(api) && getContainerParentFromAPI(api));
export class RemovePanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_REMOVE_PANEL;
  public readonly id = ACTION_REMOVE_PANEL;
  public order = 0;
  public grouping = [{ id: 'remove_panel_group', order: 1 }];

  constructor() {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.action.removePanel.displayName', {
      defaultMessage: 'Remove',
    });
  }

  public getIconType() {
    return 'trash';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) return false;

    // any parent can disallow panel removal by implementing canRemovePanels. If this method
    // is not implemented, panel removal is always allowed.
    const parentAllowsPanelRemoval = embeddable.parentApi.canRemovePanels?.() ?? true;
    return Boolean(getInheritedViewMode(embeddable) === 'edit' && parentAllowsPanelRemoval);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const { parentApi } = embeddable;
    parentApi?.removePanel(embeddable.uuid);
    if (apiHasType(embeddable) && apiHasType(parentApi)) {
      usageCollection?.reportUiCounter?.(
        parentApi.type,
        METRIC_TYPE.CLICK,
        `${embeddable.type}:panel_remove`
      );
    }
  }
}
