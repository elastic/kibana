/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel, EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import {
  ADD_IMAGE_EMBEDDABLE_ACTION_ID,
  IMAGE_EMBEDDABLE_TYPE,
} from '../image_embeddable/constants';
import { uiActionsService } from '../services/kibana_services';

export const registerCreateImageAction = () => {
  uiActionsService.registerAction<EmbeddableApiContext>({
    id: ADD_IMAGE_EMBEDDABLE_ACTION_ID,
    getIconType: () => 'image',
    isCompatible: async ({ embeddable: parentApi }) => {
      return apiCanAddNewPanel(parentApi);
    },
    execute: async ({ embeddable: parentApi }) => {
      if (!apiCanAddNewPanel(parentApi)) throw new IncompatibleActionError();
      const { openImageEditor } = await import('../components/image_editor/open_image_editor');
      try {
        const imageConfig = await openImageEditor({ parentApi });

        parentApi.addNewPanel({
          panelType: IMAGE_EMBEDDABLE_TYPE,
          initialState: { imageConfig },
        });
      } catch {
        // swallow the rejection, since this just means the user closed without saving
      }
    },
    getDisplayName: () =>
      i18n.translate('imageEmbeddable.imageEmbeddableFactory.displayName', {
        defaultMessage: 'Image',
      }),
  });

  uiActionsService.attachAction('ADD_PANEL_TRIGGER', ADD_IMAGE_EMBEDDABLE_ACTION_ID);
  if (uiActionsService.hasTrigger('ADD_CANVAS_ELEMENT_TRIGGER')) {
    // Because Canvas is not enabled in Serverless, this trigger might not be registered - only attach
    // the create action if the Canvas-specific trigger does indeed exist.
    uiActionsService.attachAction('ADD_CANVAS_ELEMENT_TRIGGER', ADD_IMAGE_EMBEDDABLE_ACTION_ID);
  }
};
