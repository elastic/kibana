/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';

import { EmbeddableDynamicActionsManager } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { imageClickTrigger } from '../actions';
import { ImageEmbeddableApi } from '../image_embeddable/types';
import { FileImageMetadata, FilesClient, imageEmbeddableFileKind } from '../imports';
import { coreServices, screenshotModeService, uiActionsService } from '../services/kibana_services';
import { ImageConfig } from '../types';
import { createValidateUrl } from '../utils/validate_url';
import { ImageViewer } from './image_viewer';
import { ImageViewerContext } from './image_viewer/image_viewer_context';

interface ImageEmbeddableProps {
  api: ImageEmbeddableApi & {
    setDataLoading: (loading: boolean | undefined) => void;
    imageConfigManager: StateManager<ImageConfig>;
    dynamicActionsManager?: EmbeddableDynamicActionsManager;
  };
  filesClient: FilesClient<FileImageMetadata>;
}

export const ImageEmbeddable = ({ api, filesClient }: ImageEmbeddableProps) => {
  const [hasTriggerActions, setHasTriggerActions] = React.useState<boolean>(false);
  const imageConfigSubscription = api.imageConfigManager.anyStateChange$.subscribe((changes) => {
    console.log({ changes });
    api.setDataLoading(true);

    return () => {
      api.setDataLoading(false);
      imageConfigSubscription.unsubscribe();
    };
  });

  if (api.dynamicActionsManager) {
    const dynamicActionsSubscription = api.dynamicActionsManager?.anyStateChange$.subscribe(
      (stateChanges) => {
        console.log({ stateChanges });
        if (api.dynamicActionsManager)
          return () => {
            dynamicActionsSubscription.unsubscribe();
          };
      }
    );
  }

  console.log({ hasTriggerActions });
  return (
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
      <ImageViewer
        // TODO: Remove data-shared-item and data-rendering-count as part of https://github.com/elastic/kibana/issues/179376
        data-shared-item={''}
        data-rendering-count={1}
        className="imageEmbeddableImage"
        imageConfig={api.imageConfigManager.getLatestState()}
        isScreenshotMode={screenshotModeService?.isScreenshotMode()}
        onLoad={() => {
          api.setDataLoading(false);
        }}
        onError={() => {
          api.setDataLoading(false);
        }}
        onClick={
          // note: passing onClick enables the cursor pointer style, so we only pass it if there are compatible actions
          hasTriggerActions
            ? () => {
                uiActionsService.executeTriggerActions(imageClickTrigger.id, {
                  embeddable: api,
                });
              }
            : undefined
        }
      />
    </ImageViewerContext.Provider>
  );
};
