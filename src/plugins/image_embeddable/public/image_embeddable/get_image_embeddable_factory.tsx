/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject } from 'rxjs';

import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import { initializeTitles } from '@kbn/presentation-publishing';

import { IMAGE_CLICK_TRIGGER } from '../actions';
import { openImageEditor } from '../components/image_editor/open_image_editor';
import { FileImageMetadata } from '../imports';
import { filesService } from '../services/kibana_services';
import { IMAGE_EMBEDDABLE_TYPE } from './constants';
import { ImageEmbeddableStrings } from './image_embeddable_strings';
import { ImageConfig, ImageEmbeddableApi, ImageEmbeddableSerializedState } from './types';

export const getImageEmbeddableFactory = ({
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
      const { ImageEmbeddable: ImageEmbeddableComponent } = await import(
        '../components/image_embeddable'
      );

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);

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
            try {
              const newImageConfig = await openImageEditor({
                parentApi: embeddable.parentApi as PresentationContainer,
                initialImageConfig: imageConfig$.getValue(),
              });
              imageConfig$.next(newImageConfig);
            } catch {
              // swallow the rejection, since this just means the user closed without saving
            }
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
        Component: () => (
          <ImageEmbeddableComponent
            api={{
              ...embeddable,
              imageConfig$,
              setDataLoading: (loading) => dataLoading$.next(loading),
              setBlockingError: (error) => blockingError$.next(error),
            }}
            filesClient={filesClient}
            startDynamicActions={dynamicActionsApi?.startDynamicActions}
          />
        ),
      };
    },
  };

  return imageEmbeddableFactory;
};
