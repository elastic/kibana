/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import {
  ADD_IMAGE_EMBEDDABLE_ACTION_ID,
  IMAGE_EMBEDDABLE_TYPE,
} from '../image_embeddable/constants';
import { ImageEmbeddableStrings } from '../image_embeddable/image_embeddable_strings';
import { uiActionsService } from '../services/kibana_services';

export const registerCreateImageAction = () => {
  uiActionsService.registerAction<EmbeddableApiContext>({
    id: ADD_IMAGE_EMBEDDABLE_ACTION_ID,
    getIconType: () => 'image',
    isCompatible: async ({ embeddable: parentApi }) => {
      return apiIsPresentationContainer(parentApi);
    },
    execute: async ({ embeddable: parentApi }) => {
      if (!apiIsPresentationContainer(parentApi)) throw new IncompatibleActionError();

      const { openImageEditor } = await import('../components/image_editor/open_image_editor');
      const imageConfig = await openImageEditor({ parentApi });

      parentApi.addNewPanel({
        panelType: IMAGE_EMBEDDABLE_TYPE,
        initialState: { imageConfig },
      });
    },
    getDisplayName: ImageEmbeddableStrings.getCreateDisplayName,
  });

  uiActionsService.attachAction('ADD_PANEL_TRIGGER', ADD_IMAGE_EMBEDDABLE_ACTION_ID);
};
