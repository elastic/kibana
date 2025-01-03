/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { CanAddNewPanel } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { IncompatibleActionError, ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import {
  ADD_IMAGE_EMBEDDABLE_ACTION_ID,
  IMAGE_EMBEDDABLE_TYPE,
} from '../image_embeddable/constants';
import { ImageEmbeddableSerializedState } from '../image_embeddable/types';
import { uiActionsService } from '../services/kibana_services';

const parentApiIsCompatible = async (parentApi: unknown): Promise<CanAddNewPanel | undefined> => {
  const { apiCanAddNewPanel } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiCanAddNewPanel(parentApi) ? (parentApi as CanAddNewPanel) : undefined;
};

export const registerCreateImageAction = () => {
  uiActionsService.registerAction<EmbeddableApiContext>({
    id: ADD_IMAGE_EMBEDDABLE_ACTION_ID,
    getIconType: () => 'image',
    order: 20,
    isCompatible: async ({ embeddable: parentApi }) => {
      return Boolean(await parentApiIsCompatible(parentApi));
    },
    execute: async ({ embeddable: parentApi }) => {
      const canAddNewPanelParent = await parentApiIsCompatible(parentApi);
      if (!canAddNewPanelParent) throw new IncompatibleActionError();
      const { openImageEditor } = await import('../components/image_editor/open_image_editor');
      try {
        const imageConfig = await openImageEditor({ parentApi: canAddNewPanelParent });

        canAddNewPanelParent.addNewPanel<ImageEmbeddableSerializedState>({
          panelType: IMAGE_EMBEDDABLE_TYPE,
          initialState: { imageConfig },
        });
      } catch {
        // swallow the rejection, since this just means the user closed without saving
      }
    },
    grouping: [COMMON_EMBEDDABLE_GROUPING.annotation],
    getDisplayName: () =>
      i18n.translate('imageEmbeddable.imageEmbeddableFactory.displayName', {
        defaultMessage: 'Image',
      }),
  });

  uiActionsService.attachAction(ADD_PANEL_TRIGGER, ADD_IMAGE_EMBEDDABLE_ACTION_ID);
  if (uiActionsService.hasTrigger('ADD_CANVAS_ELEMENT_TRIGGER')) {
    // Because Canvas is not enabled in Serverless, this trigger might not be registered - only attach
    // the create action if the Canvas-specific trigger does indeed exist.
    uiActionsService.attachAction('ADD_CANVAS_ELEMENT_TRIGGER', ADD_IMAGE_EMBEDDABLE_ACTION_ID);
  }
};
