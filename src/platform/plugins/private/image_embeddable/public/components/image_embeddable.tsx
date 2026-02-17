/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import type { PublishingSubject } from '@kbn/presentation-publishing';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { BehaviorSubject } from 'rxjs';
import type { ImageEmbeddableApi } from '../types';
import type { FileImageMetadata, FilesClient } from '../imports';
import { imageEmbeddableFileKind } from '../imports';
import { coreServices, screenshotModeService, uiActionsService } from '../services/kibana_services';
import type { ImageConfig } from '../types';
import { createValidateUrl } from '../utils/validate_url';
import { ImageViewer } from './image_viewer';
import { ImageViewerContext } from './image_viewer/image_viewer_context';

interface ImageEmbeddableProps {
  api: ImageEmbeddableApi & {
    setDataLoading: (loading: boolean | undefined) => void;
    imageConfig$: PublishingSubject<ImageConfig>;
  };
  filesClient: FilesClient<FileImageMetadata>;
}

export const ImageEmbeddable = ({ api, filesClient }: ImageEmbeddableProps) => {
  const [imageConfig, dynamicActionsState] = useBatchedPublishingSubjects(
    api.imageConfig$,
    api.dynamicActionsState$ ?? new BehaviorSubject<undefined>(undefined)
  );
  const [hasTriggerActions, setHasTriggerActions] = useState(false);

  useEffect(() => {
    /**
     * set the loading to `true` any time the image changes; the ImageViewer component
     * is responsible for setting loading to `false` again once the image loads
     */
    api.setDataLoading(true);
  }, [api, imageConfig]);

  useEffect(() => {
    // set `hasTriggerActions` depending on whether or not the image has at least one drilldown
    setHasTriggerActions((dynamicActionsState?.dynamicActions.events ?? []).length > 0);
  }, [dynamicActionsState]);

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
        imageConfig={imageConfig}
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
                uiActionsService.executeTriggerActions('IMAGE_CLICK_TRIGGER', {
                  embeddable: api,
                });
              }
            : undefined
        }
      />
    </ImageViewerContext.Provider>
  );
};
