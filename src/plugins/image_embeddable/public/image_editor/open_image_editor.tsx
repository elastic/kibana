/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { toMountPoint } from '@kbn/react-kibana-mount';
import { FilesContext } from '@kbn/shared-ux-file-context';
import { skip, Subject, take, takeUntil } from 'rxjs';
import { ImageConfig } from '../image_embeddable/types';
import { ImageViewerContext } from '../image_viewer/image_viewer_context';
import { FileImageMetadata, imageEmbeddableFileKind } from '../imports';
import { coreServices, filesService, securityService } from '../services/kibana_services';
import { createValidateUrl } from '../utils/validate_url';

export const openImageEditor = async (initialImageConfig?: ImageConfig) => {
  const { overlays, theme, application, i18n, http } = coreServices;
  const user = securityService ? await securityService.authc.getCurrentUser() : undefined;
  const filesClient = filesService.filesClientFactory.asUnscoped<FileImageMetadata>();

  const { ImageEditorFlyout } = await import('./image_editor_flyout');

  return new Promise((resolve, reject) => {
    const closed$ = new Subject<true>();

    const onSave = (imageConfig: ImageConfig) => {
      resolve(imageConfig);
      handle.close();
    };

    const onCancel = () => {
      reject();
      handle.close();
    };

    // TODO replace with tracksOverlays logic
    // Close the flyout on application change.
    application.currentAppId$.pipe(takeUntil(closed$), skip(1), take(1)).subscribe(() => {
      handle.close();
    });

    const handle = overlays.openFlyout(
      toMountPoint(
        <FilesContext client={filesClient}>
          <ImageViewerContext.Provider
            value={{
              getImageDownloadHref: (fileId: string) => {
                return filesClient.getDownloadHref({
                  id: fileId,
                  fileKind: imageEmbeddableFileKind.id,
                });
              },
              validateUrl: createValidateUrl(http.externalUrl),
            }}
          >
            <ImageEditorFlyout
              user={user}
              onCancel={onCancel}
              onSave={onSave}
              initialImageConfig={initialImageConfig}
            />
          </ImageViewerContext.Provider>
        </FilesContext>,
        { theme, i18n }
      ),
      {
        ownFocus: true,
        'data-test-subj': 'createImageEmbeddableFlyout',
      }
    );

    handle.onClose.then(() => {
      closed$.next(true);
    });
  });
};
