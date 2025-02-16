/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy } from 'react';

import { tracksOverlays, CanAddNewPanel } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FilesContext } from '@kbn/shared-ux-file-context';

import { EuiSkeletonText } from '@elastic/eui';
import { ImageConfig } from '../../image_embeddable/types';
import { FileImageMetadata, imageEmbeddableFileKind } from '../../imports';
import { coreServices, filesService } from '../../services/kibana_services';
import { createValidateUrl } from '../../utils/validate_url';
import { ImageViewerContext } from '../image_viewer/image_viewer_context';

export const openImageEditor = ({
  parentApi,
  initialImageConfig,
}: {
  parentApi: CanAddNewPanel;
  initialImageConfig?: ImageConfig;
}): Promise<ImageConfig> => {
  const LazyFlyoutContent = lazy(async () => {
    const { ImageEditorFlyout } = await import('./image_editor_flyout');
    return {
      default: ImageEditorFlyout,
    };
  });

  const filesClient = filesService.filesClientFactory.asUnscoped<FileImageMetadata>();

  /**
   * If available, the parent API will keep track of which flyout is open and close it
   * if the app changes, disable certain actions when the flyout is open, etc.
   */
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  return new Promise((resolve, reject) => {
    const onSave = (imageConfig: ImageConfig) => {
      resolve(imageConfig);
      flyoutSession.close();
      overlayTracker?.clearOverlays();
    };

    const onCancel = () => {
      reject();
      flyoutSession.close();
      overlayTracker?.clearOverlays();
    };

    const flyoutSession = coreServices.overlays.openFlyout(
      toMountPoint(
        <Suspense fallback={<EuiSkeletonText />}>
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
              <LazyFlyoutContent
                onCancel={onCancel}
                onSave={onSave}
                initialImageConfig={initialImageConfig}
              />
            </ImageViewerContext.Provider>
          </FilesContext>
        </Suspense>,
        {
          i18n: coreServices.i18n,
          theme: coreServices.theme,
        }
      ),
      {
        onClose: () => {
          onCancel();
        },
        size: 'm',
        maxWidth: 500,
        paddingSize: 'm',
        ownFocus: true,
        'data-test-subj': 'createImageEmbeddableFlyout',
      }
    );

    overlayTracker?.openOverlay(flyoutSession);
  });
};
