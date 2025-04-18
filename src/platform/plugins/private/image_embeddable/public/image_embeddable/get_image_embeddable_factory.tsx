/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { BehaviorSubject, merge } from 'rxjs';

import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { PresentationContainer, initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
} from '@kbn/presentation-publishing';

import { IMAGE_CLICK_TRIGGER } from '../actions';
import { openImageEditor } from '../components/image_editor/open_image_editor';
import { ImageEmbeddable as ImageEmbeddableComponent } from '../components/image_embeddable';
import { FileImageMetadata } from '../imports';
import { filesService } from '../services/kibana_services';
import { IMAGE_EMBEDDABLE_TYPE } from './constants';
import { ImageConfig, ImageEmbeddableApi, ImageEmbeddableSerializedState } from './types';

export const getImageEmbeddableFactory = ({
  embeddableEnhanced,
}: {
  embeddableEnhanced?: EmbeddableEnhancedPluginStart;
}) => {
  const imageEmbeddableFactory: EmbeddableFactory<
    ImageEmbeddableSerializedState,
    ImageEmbeddableApi
  > = {
    type: IMAGE_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, parentApi, finalizeApi, uuid }) => {
      const titleManager = initializeTitleManager(initialState.rawState);
      const imageConfigManager = initializeStateManager<ImageConfig>(
        initialState.rawState.imageConfig,
        {
          src: { type: 'url', url: '' },
          altText: undefined,
          sizing: { objectFit: 'contain' },
          backgroundColor: undefined,
        }
      );
      const dynamicActionsManager = embeddableEnhanced?.initializeEmbeddableDynamicActions(
        uuid,
        () => titleManager.api.title$.getValue(),
        initialState.rawState
      );
      // if it is provided, start the dynamic actions manager
      const maybeStopDynamicActions = dynamicActionsManager?.startDynamicActions();
      const filesClient = filesService.filesClientFactory.asUnscoped<FileImageMetadata>();

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

      const serializeState = () => {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            ...(dynamicActionsManager?.getLatestState() ?? {}),
            imageConfig: imageConfigManager.getLatestState(),
          },
        };
      };

      const unsavedChangesApi = initializeUnsavedChanges<ImageEmbeddableSerializedState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          dynamicActionsManager?.anyStateChange$
        ),
        getComparators: () => {
          return {
            ...titleComparators,
            ...dynamicActionsManager?.comparators,
            imageConfig: 'deepEquality',
            enhancements: 'skip',
          };
        },
        onReset: async (lastSaved) => {
          const lastRuntimeState = lastSaved ? await lastSaved.rawState : {};
          titleManager.reinitializeState(lastRuntimeState);
          dynamicActionsManager?.reinitializeState(lastRuntimeState);
        },
      });

      const embeddable = finalizeApi({
        ...unsavedChangesApi,
        ...titleManager.api,
        ...(dynamicActionsManager?.api ?? {}),
        dataLoading$,
        supportedTriggers: () => [IMAGE_CLICK_TRIGGER],
        onEdit: async () => {
          try {
            const newImageConfig = await openImageEditor({
              parentApi: embeddable.parentApi as PresentationContainer,
              initialImageConfig: imageConfigManager.getLatestState(),
            });
            imageConfigManager.reinitializeState(newImageConfig);
          } catch {
            // swallow the rejection, since this just means the user closed without saving
          }
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
              imageConfigManager,
              dynamicActionsManager,
              setDataLoading: (loading: boolean | undefined) => dataLoading$.next(loading),
            };
          }, []);

          useEffect(() => {
            return () => {
              // if it was started, stop the dynamic actions manager on unmount
              maybeStopDynamicActions?.stopDynamicActions();
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
