/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { tracksOverlays, CanAddNewPanel } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FilesContext } from '@kbn/shared-ux-file-context';

import { ImageConfig, ImageEmbeddableSerializedState } from '../../image_embeddable/types';
import { FileImageMetadata, imageEmbeddableFileKind } from '../../imports';
import { coreServices, filesService } from '../../services/kibana_services';
import { createValidateUrl } from '../../utils/validate_url';
import { ImageViewerContext } from '../image_viewer/image_viewer_context';
import {ImageEditorFlyout} from './image_editor_flyout';
import { IMAGE_EMBEDDABLE_TYPE } from '../../image_embeddable/constants';


export const getImageEditor = async ({
  parentApi,
  initialImageConfig,
}: {
  parentApi: CanAddNewPanel;
  initialImageConfig?: ImageConfig;
}): Promise<ImageConfig> => {

  const { overlays, http, security, rendering } = coreServices;
  const filesClient = filesService.filesClientFactory.asUnscoped<FileImageMetadata>();

  /**
   * If available, the parent API will keep track of which flyout is open and close it
   * if the app changes, disable certain actions when the flyout is open, etc.
   */
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  return new Promise((resolve, reject) => {
    const onCancel = () => {
      reject();
      flyoutSession.close();
      overlayTracker?.clearOverlays();
    };

    const flyoutSession = overlays.openFlyout(
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
            <ImageEditorFlyout1
              getCurrentUser={security.authc.getCurrentUser}
              onCancel={onCancel}
              onSave={(imageConfig: ImageConfig) => {
                console.log('Image config saved:', imageConfig);
                resolve(imageConfig);
                flyoutSession.close();
                overlayTracker?.clearOverlays();
              }}
              initialImageConfig={initialImageConfig}
            />
          </ImageViewerContext.Provider>
        </FilesContext>,
        rendering
      ),
      {
        onClose: onCancel,
        size: 'm',
        maxWidth: 500,
        paddingSize: 'm',
        ownFocus: true,
        'data-test-subj': 'createImageEmbeddableFlyout',
        'aria-labelledby': 'image-editor-flyout-title',
      }
    );

    overlayTracker?.openOverlay(flyoutSession);
  });
};


export const openImageEditor = async ({ 
  parentApi,
  initialImageConfig,
}: {
  parentApi: CanAddNewPanel;
  initialImageConfig?: ImageConfig;
}) => {
    const filesClient = filesService.filesClientFactory.asUnscoped<FileImageMetadata>();
  
    /**
     * If available, the parent API will keep track of which flyout is open and close it
     * if the app changes, disable certain actions when the flyout is open, etc.
     */
    const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;
    const onSave = (imageConfig: ImageConfig) => {
      parentApi.addNewPanel<ImageEmbeddableSerializedState>({
        panelType: IMAGE_EMBEDDABLE_TYPE,
        serializedState: { rawState: { imageConfig } },
      });
      overlayTracker?.clearOverlays();
    };

    return <FilesContext client={filesClient}>
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
              getCurrentUser={coreServices.security.authc.getCurrentUser}
              onSave={onSave}
              initialImageConfig={initialImageConfig}
            />
          </ImageViewerContext.Provider>
        </FilesContext>

};
