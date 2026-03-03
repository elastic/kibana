/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type {
  CanAccessViewMode,
  EmbeddableApiContext,
  HasLibraryTransforms,
  HasParentApi,
  HasType,
  HasTypeDisplayName,
  HasUniqueId,
  PublishesTitle,
  PanelPackage,
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
import type { OnSaveProps, SaveResult } from '@kbn/saved-objects-plugin/public';
import {
  SavedObjectSaveModalWithSaveResult,
  showSaveModal,
} from '@kbn/saved-objects-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { coreServices } from '../services/kibana_services';
import { dashboardAddToLibraryActionStrings } from './_dashboard_actions_strings';
import { ACTION_ADD_TO_LIBRARY, DASHBOARD_ACTION_GROUP } from './constants';

export type AddPanelToLibraryActionApi = CanAccessViewMode &
  HasType &
  HasUniqueId &
  HasLibraryTransforms &
  HasParentApi<Pick<PresentationContainer, 'replacePanel'>> &
  Partial<PublishesTitle & HasTypeDisplayName>;

const isApiCompatible = (api: unknown | null): api is AddPanelToLibraryActionApi =>
  Boolean(
    apiCanAccessViewMode(api) &&
      apiHasLibraryTransforms(api) &&
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
    return getInheritedViewMode(embeddable) === 'edit' && (await embeddable.canLinkToLibrary());
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    const lastTitle = getTitle(embeddable);
    try {
      const { byRefPackage, libraryTitle } = await new Promise<{
        byRefPackage: PanelPackage;
        libraryTitle: string;
      }>((resolve, reject) => {
        const onSave = async ({
          newTitle,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
        }: OnSaveProps): Promise<SaveResult> => {
          await embeddable.checkForDuplicateTitle(
            newTitle,
            isTitleDuplicateConfirmed,
            onTitleDuplicate
          );
          try {
            const libraryId = await embeddable.saveToLibrary(newTitle);
            const byReferenceState = embeddable.getSerializedStateByReference(libraryId);
            resolve({
              byRefPackage: {
                serializedState: { ...byReferenceState, title: newTitle },
                panelType: embeddable.type,
              },
              libraryTitle: newTitle,
            });
            return { id: libraryId };
          } catch (error) {
            reject(error);
            return { error };
          }
        };
        showSaveModal(
          <SavedObjectSaveModalWithSaveResult
            onSave={onSave}
            onClose={() => {}}
            title={lastTitle ?? ''}
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

      await embeddable.parentApi.replacePanel(embeddable.uuid, byRefPackage);
      coreServices.notifications.toasts.addSuccess({
        title: dashboardAddToLibraryActionStrings.getSuccessMessage(`'${libraryTitle}'`),
        'data-test-subj': 'addPanelToLibrarySuccess',
      });
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: dashboardAddToLibraryActionStrings.getErrorMessage(lastTitle),
        'data-test-subj': 'addPanelToLibraryError',
      });
    }
  }
}
