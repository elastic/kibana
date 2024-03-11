/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  HasSerializableState,
  apiHasSerializableState,
} from '@kbn/presentation-containers';
import {
  HasLibraryTransforms,
  apiHasLibraryTransforms,
  apiCanAccessViewMode,
  EmbeddableApiContext,
  getPanelTitle,
  PublishesPanelTitle,
  CanAccessViewMode,
  getInheritedViewMode,
  HasTypeDisplayName,
  HasType,
} from '@kbn/presentation-publishing';
import {
  SavedObjectSaveModal,
  OnSaveProps,
  SaveResult,
  showSaveModal,
} from '@kbn/saved-objects-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { pluginServices } from '../services/plugin_services';
import { dashboardAddToLibraryActionStrings } from './_dashboard_actions_strings';

export const ACTION_ADD_TO_LIBRARY = 'saveToLibrary';

export type AddPanelToLibraryActionApi = CanAccessViewMode &
  HasType &
  HasSerializableState &
  HasLibraryTransforms &
  Partial<PublishesPanelTitle & HasTypeDisplayName>;

const isApiCompatible = (api: unknown | null): api is AddPanelToLibraryActionApi =>
  Boolean(apiCanAccessViewMode(api) && apiHasLibraryTransforms(api) && apiHasSerializableState(api));

export class AddToLibraryAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_ADD_TO_LIBRARY;
  public readonly id = ACTION_ADD_TO_LIBRARY;
  public order = 15;

  private toastsService;

  constructor() {
    ({
      notifications: { toasts: this.toastsService },
    } = pluginServices.getServices());
  }

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
    const panelTitle = getPanelTitle(embeddable);
    try {
      
      // Link to library
      const newInput = new Promise<RefType>((resolve, reject) => {
        const onSave = async (props: OnSaveProps): Promise<SaveResult> => {
          await embeddable.checkForDuplicateTitle(props);
          try {
            const newAttributes = embeddable.serializeState();
            newAttributes.title = props.newTitle;
            const wrappedInput = (await this.wrapAttributes(
              newAttributes,
              true
            )) as unknown as RefType;
            // Remove unneeded attributes from the original input. Note that the original panel title
            // is removed in favour of the new attributes title
            const newInput = omit(input, [ATTRIBUTE_SERVICE_KEY, 'title']);
  
            // Combine input and wrapped input to preserve any passed in explicit Input
            resolve({ ...newInput, ...wrappedInput });
            return { id: wrappedInput.savedObjectId };
          } catch (error) {
            reject(error);
            return { error };
          }
        };
        showSaveModal(
          <SavedObjectSaveModal
            onSave={onSave}
            onClose={() => {}}
            title={panelTitle ?? embeddable.type}
            showCopyOnSave={false}
            objectType={
              embeddable.getTypeDisplayName?.() ?? embeddable.type
            }
            showDescription={false}
          />
        );
      });
      embeddable.updateInput(newInput);

      // Replace panel in parent.
      const panelToReplace = root.getInput().panels[embeddable.id];
      if (!panelToReplace) {
        throw new PanelNotFoundError();
      }
      await root.replacePanel(panelToReplace.explicitInput.id, {
        panelType: embeddable.type,
        initialState: { ...newInput },
      });
      
     throw new Error('not implemented');
      this.toastsService.addSuccess({
        title: dashboardAddToLibraryActionStrings.getSuccessMessage(
          panelTitle ? `'${panelTitle}'` : ''
        ),
        'data-test-subj': 'addPanelToLibrarySuccess',
      });
    } catch (e) {
      this.toastsService.addDanger({
        title: dashboardAddToLibraryActionStrings.getErrorMessage(
          panelTitle ? `'${panelTitle}'` : ''
        ),
        'data-test-subj': 'addPanelToLibraryError',
      });
    }
  }
}
