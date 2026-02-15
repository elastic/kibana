/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CanAccessViewMode,
  EmbeddableApiContext,
  HasLibraryTransforms,
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesTitle,
  PresentationContainer,
} from '@kbn/presentation-publishing';
import {
  apiCanAccessViewMode,
  apiHasLibraryTransforms,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  getInheritedViewMode,
  getTitle,
} from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { coreServices } from '../services/kibana_services';
import { dashboardUnlinkFromLibraryActionStrings } from './_dashboard_actions_strings';
import { ACTION_UNLINK_FROM_LIBRARY, DASHBOARD_ACTION_GROUP } from './constants';

export type UnlinkPanelFromLibraryActionApi = CanAccessViewMode &
  HasLibraryTransforms &
  HasType &
  HasUniqueId &
  HasParentApi<Pick<PresentationContainer, 'replacePanel'>> &
  Partial<PublishesTitle>;

export const isApiCompatible = (api: unknown | null): api is UnlinkPanelFromLibraryActionApi =>
  Boolean(
    apiCanAccessViewMode(api) &&
      apiHasLibraryTransforms(api) &&
      apiHasUniqueId(api) &&
      apiHasType(api) &&
      apiHasParentApi(api) &&
      typeof (api.parentApi as PresentationContainer)?.replacePanel === 'function'
  );

export class UnlinkFromLibraryAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_UNLINK_FROM_LIBRARY;
  public readonly id = ACTION_UNLINK_FROM_LIBRARY;
  public order = 15;
  public grouping = [DASHBOARD_ACTION_GROUP];

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardUnlinkFromLibraryActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'folderExclamation';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) {
      // either a an `unlinkFromLibrary` method or a `getByValueState` method is required
      return false;
    }
    return getInheritedViewMode(embeddable) === 'edit' && (await embeddable.canUnlinkFromLibrary());
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const title = getTitle(embeddable);
    try {
      const byValueState = embeddable.getSerializedStateByValue();
      await embeddable.parentApi.replacePanel(embeddable.uuid, {
        panelType: embeddable.type,
        serializedState: { ...byValueState, title },
      });
      coreServices.notifications.toasts.addSuccess({
        title: dashboardUnlinkFromLibraryActionStrings.getSuccessMessage(title ? `'${title}'` : ''),
        'data-test-subj': 'unlinkPanelSuccess',
      });
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: dashboardUnlinkFromLibraryActionStrings.getFailureMessage(title ? `'${title}'` : ''),
        'data-test-subj': 'unlinkPanelFailure',
      });
    }
  }
}
