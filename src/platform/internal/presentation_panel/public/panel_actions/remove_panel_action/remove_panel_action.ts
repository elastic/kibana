/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  apiHasUniqueId,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasParentApi,
  HasUniqueId,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { getContainerParentFromAPI, PresentationContainer } from '@kbn/presentation-containers';

export const ACTION_REMOVE_PANEL = 'deletePanel';

export type RemovePanelActionApi = PublishesViewMode &
  HasUniqueId &
  HasParentApi<PresentationContainer>;

const isApiCompatible = (api: unknown | null): api is RemovePanelActionApi =>
  Boolean(apiHasUniqueId(api) && apiCanAccessViewMode(api) && getContainerParentFromAPI(api));

export class RemovePanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_REMOVE_PANEL;
  public readonly id = ACTION_REMOVE_PANEL;
  public order = 1;

  constructor() {}

  public getDisplayName() {
    return i18n.translate('presentationPanel.action.removePanel.displayName', {
      defaultMessage: 'Delete from dashboard',
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
    embeddable.parentApi?.removePanel(embeddable.uuid);
  }
}
