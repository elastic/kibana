/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';

import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';
import {
  initializeUnsavedChanges,
  initializeTitleManager,
  titleComparators,
} from '@kbn/presentation-publishing';

import type { ImageEmbeddableState } from '../../server';
import { ImageEmbeddable as ImageEmbeddableComponent } from '../components/image_embeddable';
import type { FileImageMetadata } from '../imports';
import { coreServices, filesService } from '../services/kibana_services';
import { IMAGE_EMBEDDABLE_SUPPORTED_TRIGGERS, IMAGE_EMBEDDABLE_TYPE } from '../../common/constants';
import type { ImageConfig, ImageEmbeddableApi } from '../types';

export const getImageEmbeddableFactory = () => {
  const imageEmbeddableFactory: EmbeddableFactory<ImageEmbeddableState, ImageEmbeddableApi> = {
    type: IMAGE_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({
      initializeDrilldownsManager,
      initialState,
      finalizeApi,
      uuid,
      parentApi,
    }) => {
      const titleManager = initializeTitleManager(initialState);

      const drilldownsManager = await initializeDrilldownsManager(uuid, initialState);

      const filesClient = filesService.filesClientFactory.asUnscoped<FileImageMetadata>();
      const imageConfig$ = new BehaviorSubject<ImageConfig>(initialState.imageConfig);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

      function serializeState() {
        return {
          ...titleManager.getLatestState(),
          ...drilldownsManager.getLatestState(),
          imageConfig: imageConfig$.getValue(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<ImageEmbeddableState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          imageConfig$.pipe(map(() => undefined)),
          drilldownsManager.anyStateChange$
        ),
        getComparators: () => {
          return {
            ...drilldownsManager.comparators,
            ...titleComparators,
            imageConfig: 'deepEquality',
          };
        },
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved);
          drilldownsManager.reinitializeState(lastSaved ?? {});
          if (lastSaved) imageConfig$.next(lastSaved.imageConfig);
        },
      });

      const embeddable = finalizeApi({
        ...titleManager.api,
        ...drilldownsManager.api,
        ...unsavedChangesApi,
        dataLoading$,
        supportedTriggers: () => IMAGE_EMBEDDABLE_SUPPORTED_TRIGGERS,

        onEdit: async () => {
          openLazyFlyout({
            core: coreServices,
            parentApi,
            loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
              const { getImageEditor } = await import(
                '../components/image_editor/get_image_editor'
              );
              return await getImageEditor({
                closeFlyout,
                ariaLabelledBy,
                initialImageConfig: imageConfig$.getValue(),
                onSave: (newImageConfig: ImageConfig) => {
                  imageConfig$.next(newImageConfig);
                },
              });
            },
          });
        },
        isEditingEnabled: () => true,
        getTypeDisplayName: () =>
          i18n.translate('imageEmbeddable.imageEmbeddableFactory.displayName.edit', {
            defaultMessage: 'image',
          }),
        serializeState,
      });
      return {
        api: embeddable,
        Component: () => {
          const privateImageEmbeddableApi = useMemo(() => {
            /** Memoize the API so that the reference stays consistent and it can be used as a dependency */
            return {
              ...embeddable,
              imageConfig$,
              setDataLoading: (loading: boolean | undefined) => dataLoading$.next(loading),
            };
          }, []);

          useEffect(() => {
            return () => {
              drilldownsManager.cleanup();
            };
          }, []);

          return (
            <ImageEmbeddableComponent api={privateImageEmbeddableApi} filesClient={filesClient} />
          );
        },
      };
    },
  };

  return imageEmbeddableFactory;
};
