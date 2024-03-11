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
  useReactEmbeddableUnsavedChanges,
} from '@kbn/embeddable-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public/plugin';
import { FileImageMetadata } from '@kbn/shared-ux-file-types';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject } from 'rxjs';
import { imageClickTrigger } from '../actions';
import { ImageViewer, ImageViewerContext } from '../image_viewer';
import { FilesStart, imageEmbeddableFileKind } from '../imports';
import { createValidateUrl } from '../utils/validate_url';
import { IMAGE_EMBEDDABLE_TYPE } from './constants';
import {
  ImageEmbeddableApi,
  ImageEmbeddableSerializedState,
  ImageFileSrc,
  ImageSizing,
  ImageUrlSrc,
} from './types';

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
      const altText$ = new BehaviorSubject<string | undefined>(initialState.altText);
      const src$ = new BehaviorSubject<ImageFileSrc | ImageUrlSrc>(initialState.src);
      const sizing$ = new BehaviorSubject<{ objectFit: ImageSizing }>(initialState.sizing);
      const backgroundColor$ = new BehaviorSubject<string | undefined>(
        initialState.backgroundColor
      );

      return RegisterReactEmbeddable<ImageEmbeddableApi>((apiRef) => {
        const [hasTriggerActions, setHasTriggerActions] = useState(false);
        const [src, sizing, altText, backgroundColor] = useBatchedPublishingSubjects(
          src$,
          sizing$,
          altText$,
          backgroundColor$
        );
        // const imageConfig = usePublishingSubject(imageConfig$);

        useLayoutEffect(() => {
          import('./image_embeddable_lazy');
        }, []);

        const { unsavedChanges, resetUnsavedChanges } = useReactEmbeddableUnsavedChanges(
          uuid,
          imageEmbeddableFactory,
          {
            src: [src$, (value) => src$.next(value), (a, b) => deepEqual(a, b)],
            sizing: [
              sizing$,
              (value) => sizing$.next(value),
              (a, b) => a?.objectFit === b?.objectFit,
            ],
            altText: [altText$, (value) => altText$.next(value)],
            backgroundColor: [backgroundColor$, (value) => backgroundColor$.next(value)],
            ...titleComparators,
          }
        );

        useReactEmbeddableApiHandle(
          {
            ...titlesApi,
            unsavedChanges,
            resetUnsavedChanges,
            onEdit: () => {
              console.log('on edit');
            },
            isEditingEnabled: () => true,
            getTypeDisplayName: () => 'test',
            serializeState: async () => {
              return { rawState: { src, sizing, altText, backgroundColor, ...serializeTitles() } };
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
              imageConfig={{ src, sizing, altText, backgroundColor }}
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
