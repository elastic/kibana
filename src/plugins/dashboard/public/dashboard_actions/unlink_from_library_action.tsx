/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import {
  apiCanAccessViewMode,
  apiHasLibraryTransforms,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  getPanelTitle,
  PublishesPanelTitle,
  HasLibraryTransforms,
  HasParentApi,
  apiHasParentApi,
  HasUniqueId,
  apiHasUniqueId,
  HasType,
  apiHasType,
  HasInPlaceLibraryTransforms,
  apiHasInPlaceLibraryTransforms,
} from '@kbn/presentation-publishing';
import { PresentationContainer } from '@kbn/presentation-containers';
import { pluginServices } from '../services/plugin_services';
import { dashboardUnlinkFromLibraryActionStrings } from './_dashboard_actions_strings';

export const ACTION_UNLINK_FROM_LIBRARY = 'unlinkFromLibrary';

export type UnlinkPanelFromLibraryActionApi = CanAccessViewMode &
  (HasLibraryTransforms | HasInPlaceLibraryTransforms) &
  HasType &
  HasUniqueId &
  HasParentApi<Pick<PresentationContainer, 'replacePanel'>> &
  Partial<PublishesPanelTitle>;

export const isApiCompatible = (api: unknown | null): api is UnlinkPanelFromLibraryActionApi =>
  Boolean(
    apiCanAccessViewMode(api) &&
      (apiHasLibraryTransforms(api) || apiHasInPlaceLibraryTransforms(api)) &&
      apiHasUniqueId(api) &&
      apiHasType(api) &&
      apiHasParentApi(api) &&
      typeof (api.parentApi as PresentationContainer)?.replacePanel === 'function'
  );

export class UnlinkFromLibraryAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_UNLINK_FROM_LIBRARY;
  public readonly id = ACTION_UNLINK_FROM_LIBRARY;
  public order = 15;

  private toastsService;

  constructor() {
    ({
      notifications: { toasts: this.toastsService },
    } = pluginServices.getServices());
  }

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardUnlinkFromLibraryActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'folderExclamation';
  }

  public async canUnlinkFromLibrary(api: UnlinkPanelFromLibraryActionApi) {
    if (apiHasLibraryTransforms(api)) {
      return api.canUnlinkFromLibrary();
    } else if (apiHasInPlaceLibraryTransforms(api)) {
      const canUnLink = api.canUnlinkFromLibrary ? await api.canUnlinkFromLibrary() : true;
      return canUnLink && Boolean(api.libraryId$.value);
    }
    throw new IncompatibleActionError();
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) {
      // either a an `unlinkFromLibrary` method or a `getByValueState` method is required
      return false;
    }
    return (
      getInheritedViewMode(embeddable) === 'edit' && (await this.canUnlinkFromLibrary(embeddable))
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const title = getPanelTitle(embeddable);
    try {
      if (apiHasLibraryTransforms(embeddable)) {
        await embeddable.parentApi.replacePanel(embeddable.uuid, {
          panelType: embeddable.type,
          initialState: { ...embeddable.getByValueState(), title },
        });
      } else if (apiHasInPlaceLibraryTransforms(embeddable)) {
        embeddable.unlinkFromLibrary();
      } else {
        throw new IncompatibleActionError();
      }
      this.toastsService.addSuccess({
        title: dashboardUnlinkFromLibraryActionStrings.getSuccessMessage(title ? `'${title}'` : ''),
        'data-test-subj': 'unlinkPanelSuccess',
      });
    } catch (e) {
      this.toastsService.addDanger({
        title: dashboardUnlinkFromLibraryActionStrings.getFailureMessage(title ? `'${title}'` : ''),
        'data-test-subj': 'unlinkPanelFailure',
      });
    }
  }
}
