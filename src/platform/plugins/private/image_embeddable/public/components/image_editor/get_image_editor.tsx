/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { FilesContext } from '@kbn/shared-ux-file-context';

import { ImageConfig } from '../../image_embeddable/types';
import { FileImageMetadata, imageEmbeddableFileKind } from '../../imports';
import { coreServices, filesService } from '../../services/kibana_services';
import { createValidateUrl } from '../../utils/validate_url';
import { ImageViewerContext } from '../image_viewer/image_viewer_context';
import { ImageEditorFlyout } from './image_editor_flyout';

export const getImageEditor = async ({
  initialImageConfig,
  onSave,
  closeFlyout,
  ariaLabelledBy,
}: {
  initialImageConfig?: ImageConfig;
  onSave?: (imageConfig: ImageConfig) => void;
  closeFlyout: () => void;
  ariaLabelledBy: string;
}) => {
  const filesClient = filesService.filesClientFactory.asUnscoped<FileImageMetadata>();
  const user = await coreServices.security.authc.getCurrentUser();

  return (
    <FilesContext client={filesClient}>
      <ImageViewerContext.Provider
        value={{
          getImageDownloadHref: (fileId: string) => {
            return filesClient.getDownloadHref({
              id: fileId,
              fileKind: imageEmbeddableFileKind.id,
            });
          },
          validateUrl: createValidateUrl(coreServices.http.externalUrl),
        }}
      >
        <ImageEditorFlyout
          user={user}
          onSave={(imageConfig: ImageConfig) => {
            onSave?.(imageConfig);
            closeFlyout();
          }}
          onCancel={closeFlyout}
          initialImageConfig={initialImageConfig}
          ariaLabelledBy={ariaLabelledBy}
        />
      </ImageViewerContext.Provider>
    </FilesContext>
  );
};
