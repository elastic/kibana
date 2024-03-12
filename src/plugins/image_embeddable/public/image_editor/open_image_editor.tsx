/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { ImageConfig } from '../image_embeddable/types';
import { FileImageMetadata, FilesStart, imageEmbeddableFileKind } from '../imports';
import { createValidateUrl } from '../utils/validate_url';

interface ImageEditorDeps {
  core: CoreStart;
  files: FilesStart;
  security?: SecurityPluginStart;
}

export const openImageEditor = async (
  { core, files, security }: ImageEditorDeps,
  initialConfig?: ImageConfig
) => {
  const { configureImage } = await import('./configure_image');
  const { overlays, theme, application } = core;
  const user = security ? await security.authc.getCurrentUser() : undefined;
  const filesClient = files.filesClientFactory.asUnscoped<FileImageMetadata>();

  const imageConfig = await configureImage(
    {
      files: filesClient,
      overlays,
      theme,
      user,
      i18n: core.i18n,
      currentAppId$: application.currentAppId$,
      validateUrl: createValidateUrl(core.http.externalUrl),
      getImageDownloadHref: (fileId: string) => {
        return filesClient.getDownloadHref({
          id: fileId,
          fileKind: imageEmbeddableFileKind.id,
        });
      },
    },
    initialConfig
  );

  return imageConfig;
};
