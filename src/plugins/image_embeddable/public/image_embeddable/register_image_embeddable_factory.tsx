/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject } from 'rxjs';

import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import {
  initializeReactEmbeddableTitles,
  ReactEmbeddableFactory,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';

import { imageClickTrigger, IMAGE_CLICK_TRIGGER } from '../actions';
import { openImageEditor } from '../image_editor/open_image_editor';
import { ImageViewer, ImageViewerContext } from '../image_viewer';
import { FileImageMetadata, imageEmbeddableFileKind } from '../imports';
import {
  coreServices,
  filesService,
  screenshotModeService,
  uiActionsService,
} from '../services/kibana_services';
import { createValidateUrl } from '../utils/validate_url';
import { IMAGE_EMBEDDABLE_TYPE } from './constants';
import { ImageEmbeddableStrings } from './image_embeddable_strings';
import { ImageConfig, ImageEmbeddableApi, ImageEmbeddableSerializedState } from './types';

import './image_embeddable.scss';

export const registerImageEmbeddableFactory = ({
  embeddableEnhanced,
}: {
  embeddableEnhanced?: EmbeddableEnhancedPluginStart;
}) => {
  const imageEmbeddableFactory: ReactEmbeddableFactory<
    ImageEmbeddableSerializedState,
    ImageEmbeddableApi
  > = {
    type: IMAGE_EMBEDDABLE_TYPE,
    deserializeState: (state) => {
      return state.rawState as ImageEmbeddableSerializedState;
    },
    buildEmbeddable: async (initialState, buildApi, uuid) => {
      const { titlesApi, titleComparators, serializeTitles } =
        initializeReactEmbeddableTitles(initialState);

      const dynamicActionsApi = embeddableEnhanced?.initializeReactEmbeddableDynamicActions(
        uuid,
        () => titlesApi.panelTitle.getValue(),
        initialState
      );

      const filesClient = filesService.filesClientFactory.asUnscoped<FileImageMetadata>();
      const imageConfig$ = new BehaviorSubject<ImageConfig>(initialState.imageConfig);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const embeddable = buildApi(
        {
          ...titlesApi,
          ...(dynamicActionsApi?.dynamicActionsApi ?? {}),
          dataLoading: dataLoading$,
          blockingError: blockingError$,
          supportedTriggers: () => [IMAGE_CLICK_TRIGGER],
          onEdit: async () => {
            const newImageConfig = await openImageEditor(imageConfig$.getValue());
            imageConfig$.next(newImageConfig);
          },
          isEditingEnabled: () => true,
          getTypeDisplayName: ImageEmbeddableStrings.getEditDisplayName,
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
                ...(dynamicActionsApi?.serializeDynamicActions() ?? {}),
                imageConfig: imageConfig$.getValue(),
              },
            };
          },
        },
        {
          ...titleComparators,
          ...(dynamicActionsApi?.dynamicActionsComparator ?? {}),
          imageConfig: [
            imageConfig$,
            (value) => imageConfig$.next(value),
            (a, b) => deepEqual(a, b),
          ],
        }
      );

      return {
        api: embeddable,
        Component: () => {
          const imageConfig = useStateFromPublishingSubject(imageConfig$);
          const [hasTriggerActions, setHasTriggerActions] = useState(false);

          useEffect(() => {
            if (!dynamicActionsApi) return;
            // start the dynamic actions manager on mount
            const { stopDynamicActions } = dynamicActionsApi.startDynamicActions();
            return () => {
              // stop the dynamic actions manager on unmount
              stopDynamicActions();
            };
          }, []);

          useEffect(() => {
            let mounted = true;

            // hack: timeout to give a chance for a drilldown action to be registered just after it is created by user
            setTimeout(() => {
              if (!mounted) return;

              uiActionsService
                .getTriggerCompatibleActions(imageClickTrigger.id, { embeddable })
                .catch(() => [])
                .then((actions) => {
                  if (mounted) setHasTriggerActions(actions.length > 0);
                });
            }, 0);
            return () => {
              mounted = false;
            };
          });

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
                className="imageEmbeddableImage"
                imageConfig={imageConfig}
                isScreenshotMode={screenshotModeService?.isScreenshotMode()}
                onLoad={() => {
                  dataLoading$.next(false);
                }}
                onError={() => {
                  dataLoading$.next(false);
                  blockingError$.next(new Error(ImageEmbeddableStrings.getErrorMessage()));
                }}
                onClick={
                  // note: passing onClick enables the cursor pointer style, so we only pass it if there are compatible actions
                  hasTriggerActions
                    ? () => {
                        uiActionsService.executeTriggerActions(imageClickTrigger.id, {
                          embeddable,
                        });
                      }
                    : undefined
                }
              />
            </ImageViewerContext.Provider>
          );
        },
      };
    },
  };

  registerReactEmbeddableFactory(imageEmbeddableFactory);
};
