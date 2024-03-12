/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  initializeReactEmbeddableTitles,
  initializeReactEmbeddableUuid,
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
  useReactEmbeddableApiHandle,
  useReactEmbeddableParentApi,
  useReactEmbeddableUnsavedChanges,
} from '@kbn/embeddable-plugin/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public/plugin';
import { FileImageMetadata } from '@kbn/shared-ux-file-types';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject } from 'rxjs';
import { imageClickTrigger } from '../actions';
import { openImageEditor } from '../image_editor/open_image_editor';
import { ImageViewer, ImageViewerContext } from '../image_viewer';
import { FilesStart, imageEmbeddableFileKind } from '../imports';
import { createValidateUrl } from '../utils/validate_url';
import { IMAGE_EMBEDDABLE_TYPE } from './constants';
import { ImageEmbeddableStrings } from './image_embeddable_strings';
import { ImageConfig, ImageEmbeddableApi, ImageEmbeddableSerializedState } from './types';

export interface ImageEmbeddableFactoryDeps {
  core: CoreStart;
  files: FilesStart;
  security?: SecurityPluginStart;
  uiActions: UiActionsPublicStart;
  screenshotMode?: ScreenshotModePluginStart;
}

export const registerImageEmbeddableFactory = (deps: ImageEmbeddableFactoryDeps) => {
  const imageEmbeddableFactory: ReactEmbeddableFactory<
    ImageEmbeddableSerializedState,
    ImageEmbeddableApi
  > = {
    deserializeState: (state) => {
      return state.rawState as ImageEmbeddableSerializedState;
    },
    getComponent: async (initialState, maybeId) => {
      const uuid = initializeReactEmbeddableUuid(maybeId);
      const { titlesApi, titleComparators, serializeTitles } =
        initializeReactEmbeddableTitles(initialState);
      const filesClient = deps.files.filesClientFactory.asUnscoped<FileImageMetadata>();
      const imageConfig$ = new BehaviorSubject<ImageConfig>(initialState.imageConfig);

      return RegisterReactEmbeddable<ImageEmbeddableApi>((apiRef) => {
        const parentApi = useReactEmbeddableParentApi();
        const imageConfig = useStateFromPublishingSubject(imageConfig$);

        const [hasTriggerActions, setHasTriggerActions] = useState(false);

        useLayoutEffect(() => {
          import('./image_embeddable_lazy');
        }, []);

        const { unsavedChanges, resetUnsavedChanges } = useReactEmbeddableUnsavedChanges(
          uuid,
          imageEmbeddableFactory,
          {
            imageConfig: [
              imageConfig$,
              (value) => imageConfig$.next(value),
              (a, b) => deepEqual(a, b),
            ],
            ...titleComparators,
          }
        );

        useReactEmbeddableApiHandle(
          {
            ...titlesApi,
            unsavedChanges,
            resetUnsavedChanges,
            onEdit: async () => {
              const newImageConfig = await openImageEditor(
                {
                  core: deps.core,
                  files: deps.files,
                  security: deps.security,
                },
                imageConfig
              );

              if (apiIsPresentationContainer(parentApi)) {
                parentApi.replacePanel(uuid, {
                  panelType: IMAGE_EMBEDDABLE_TYPE,
                  initialState: { imageConfig: newImageConfig, ...serializeTitles() },
                });
              }
            },
            isEditingEnabled: () => true,
            getTypeDisplayName: ImageEmbeddableStrings.getEditDisplayName,
            serializeState: async () => {
              return {
                rawState: {
                  imageConfig,
                  ...serializeTitles(),
                },
              };
            },
          },
          apiRef,
          uuid
        );

        useEffect(() => {
          let mounted = true;

          // hack: timeout to give a chance for a drilldown action to be registered just after it is created by user
          setTimeout(() => {
            if (!mounted) return;
            deps.uiActions
              .getTriggerCompatibleActions(imageClickTrigger.id, { embeddable: this })
              .catch(() => [])
              .then((actions) => mounted && setHasTriggerActions(actions.length > 0));
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
              validateUrl: createValidateUrl(deps.core.http.externalUrl),
            }}
          >
            <ImageViewer
              className="imageEmbeddableImage"
              imageConfig={imageConfig}
              isScreenshotMode={deps.screenshotMode?.isScreenshotMode()}
              // onLoad={() => {
              //   this.renderComplete.dispatchComplete();
              // }}
              // onError={() => {
              //   this.renderComplete.dispatchError();
              // }}
              onClick={
                // note: passing onClick enables the cursor pointer style, so we only pass it if there are compatible actions
                hasTriggerActions
                  ? () => {
                      deps.uiActions.executeTriggerActions(imageClickTrigger.id, {
                        embeddable: this,
                      });
                    }
                  : undefined
              }
            />
          </ImageViewerContext.Provider>
        );
      });
    },
  };

  registerReactEmbeddableFactory(IMAGE_EMBEDDABLE_TYPE, imageEmbeddableFactory);
};
