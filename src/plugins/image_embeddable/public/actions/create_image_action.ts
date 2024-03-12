/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { openImageEditor } from '../image_editor/open_image_editor';
import {
  ADD_IMAGE_EMBEDDABLE_ACTION_ID,
  IMAGE_EMBEDDABLE_TYPE,
} from '../image_embeddable/constants';
import { ImageEmbeddableStrings } from '../image_embeddable/image_embeddable_strings';
import { FilesStart } from '../imports';

interface CreateImageDeps {
  core: CoreStart;
  files: FilesStart;
  security?: SecurityPluginStart;
  uiActions: UiActionsPublicStart;
}

export const registerCreateImageAction = ({
  core,
  files,
  security,
  uiActions,
}: CreateImageDeps) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_IMAGE_EMBEDDABLE_ACTION_ID,
    getIconType: () => 'image',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();

      const imageConfig = await openImageEditor({ core, files, security });

      embeddable.addNewPanel({
        panelType: IMAGE_EMBEDDABLE_TYPE,
        initialState: imageConfig,
      });
    },
    getDisplayName: ImageEmbeddableStrings.getCreateDisplayName,
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_IMAGE_EMBEDDABLE_ACTION_ID);
};
