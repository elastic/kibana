/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, IExternalUrl } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import {
  ADD_IMAGE_EMBEDDABLE_ACTION_ID,
  IMAGE_EMBEDDABLE_TYPE,
} from '../image_embeddable/constants';
import { FileImageMetadata, FilesStart, imageEmbeddableFileKind } from '../imports';
import { createValidateUrl } from '../utils/validate_url';

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

      const { configureImage } = await import('../image_editor');
      const { overlays, theme, application } = core;
      const user = security ? await security.authc.getCurrentUser() : undefined;
      const filesClient = files.filesClientFactory.asUnscoped<FileImageMetadata>();

      const imageConfig = await configureImage(
        {
          files: filesClient,
          overlays,
          theme,
          user,
          currentAppId$: application.currentAppId$,
          validateUrl: createValidateUrl(core.http.externalUrl),
          getImageDownloadHref: (fileId: string) => {
            return filesClient.getDownloadHref({
              id: fileId,
              fileKind: imageEmbeddableFileKind.id,
            });
          },
        },
        undefined
      );

      embeddable.addNewPanel({
        panelType: IMAGE_EMBEDDABLE_TYPE,
        initialState: imageConfig,
      });
    },
    getDisplayName: () =>
      i18n.translate('imageEmbeddable.imageEmbeddableFactory.displayName', {
        defaultMessage: 'Image',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_IMAGE_EMBEDDABLE_ACTION_ID);
};
