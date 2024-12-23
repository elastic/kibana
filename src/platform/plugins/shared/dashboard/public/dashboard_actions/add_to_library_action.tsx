/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { PresentationContainer } from '@kbn/presentation-containers';
import {
  CanAccessViewMode,
  EmbeddableApiContext,
  HasInPlaceLibraryTransforms,
  HasLibraryTransforms,
  HasParentApi,
  HasType,
  HasTypeDisplayName,
  HasUniqueId,
  PublishesPanelTitle,
  apiCanAccessViewMode,
  apiHasInPlaceLibraryTransforms,
  apiHasLibraryTransforms,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  getInheritedViewMode,
  getPanelTitle,
} from '@kbn/presentation-publishing';
import {
  OnSaveProps,
  SaveResult,
  SavedObjectSaveModal,
  showSaveModal,
} from '@kbn/saved-objects-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { coreServices } from '../services/kibana_services';
import { dashboardAddToLibraryActionStrings } from './_dashboard_actions_strings';
import { DASHBOARD_ACTION_GROUP } from '.';

export const ACTION_ADD_TO_LIBRARY = 'saveToLibrary';

export type AddPanelToLibraryActionApi = CanAccessViewMode &
  HasType &
  HasUniqueId &
  (HasLibraryTransforms | HasInPlaceLibraryTransforms) &
  HasParentApi<Pick<PresentationContainer, 'replacePanel'>> &
  Partial<PublishesPanelTitle & HasTypeDisplayName>;

const isApiCompatible = (api: unknown | null): api is AddPanelToLibraryActionApi =>
  Boolean(
    apiCanAccessViewMode(api) &&
      (apiHasLibraryTransforms(api) || apiHasInPlaceLibraryTransforms(api)) &&
      apiHasType(api) &&
      apiHasUniqueId(api) &&
      apiHasParentApi(api) &&
      typeof (api.parentApi as PresentationContainer)?.replacePanel === 'function'
  );

export class AddToLibraryAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_ADD_TO_LIBRARY;
  public readonly id = ACTION_ADD_TO_LIBRARY;
  public order = 8;
  public grouping = [DASHBOARD_ACTION_GROUP];

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardAddToLibraryActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'folderCheck';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) return false;
    return getInheritedViewMode(embeddable) === 'edit' && (await this.canLinkToLibrary(embeddable));
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const title = getPanelTitle(embeddable);

    try {
      const byRefState = await new Promise<object | undefined>((resolve, reject) => {
        const onSave = async (props: OnSaveProps): Promise<SaveResult> => {
          await embeddable.checkForDuplicateTitle(
            props.newTitle,
            props.isTitleDuplicateConfirmed,
            props.onTitleDuplicate
          );
          try {
            const libraryId = await embeddable.saveToLibrary(props.newTitle);
            if (apiHasLibraryTransforms(embeddable)) {
              resolve({ ...embeddable.getByReferenceState(libraryId), title: props.newTitle });
            }
            resolve(undefined);
            return { id: libraryId };
          } catch (error) {
            reject(error);
            return { error };
          }
        };
        showSaveModal(
          <SavedObjectSaveModal
            onSave={onSave}
            onClose={() => {}}
            title={title ?? ''}
            showCopyOnSave={false}
            objectType={
              typeof embeddable.getTypeDisplayName === 'function'
                ? embeddable.getTypeDisplayName()
                : embeddable.type
            }
            showDescription={false}
          />
        );
      });
      /**
       * If byRefState is defined, this embeddable type must be re-initialized with the
       * newly provided state.
       */
      if (byRefState) {
        await embeddable.parentApi.replacePanel(embeddable.uuid, {
          panelType: embeddable.type,
          initialState: byRefState,
        });
      }
      coreServices.notifications.toasts.addSuccess({
        title: dashboardAddToLibraryActionStrings.getSuccessMessage(title ? `'${title}'` : ''),
        'data-test-subj': 'addPanelToLibrarySuccess',
      });
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: dashboardAddToLibraryActionStrings.getErrorMessage(title),
        'data-test-subj': 'addPanelToLibraryError',
      });
    }
  }

  private async canLinkToLibrary(api: AddPanelToLibraryActionApi) {
    if (apiHasLibraryTransforms(api)) {
      return api.canLinkToLibrary?.();
    } else if (apiHasInPlaceLibraryTransforms(api)) {
      const canLink = api.canLinkToLibrary ? await api.canLinkToLibrary() : true;
      return api.libraryId$.value === undefined && canLink;
    }
    throw new IncompatibleActionError();
  }
}
