/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import { extractSearchSourceReferences } from '@kbn/data-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { SerializedTitles } from '@kbn/presentation-publishing';
import { cloneDeep, omit } from 'lodash';
import {
  getAnalytics,
  getDataViews,
  getI18n,
  getOverlays,
  getSavedObjectTagging,
  getSearch,
  getSpaces,
  getTheme,
} from '../services';
import {
  deserializeReferences,
  serializeReferences,
} from '../utils/saved_visualization_references';
import { getSavedVisualization } from '../utils/saved_visualize_utils';
import type { SerializedVis } from '../vis';
import { createVisAsync } from '../vis_async';
import {
  isVisualizeSavedObjectState,
  VisualizeSavedObjectInputState,
  VisualizeSerializedState,
  VisualizeRuntimeState,
  VisualizeSavedVisInputState,
} from './types';

export const deserializeState = async (
  state: SerializedPanelState<VisualizeSerializedState> | { rawState: undefined }
) => {
  if (!state.rawState)
    return {
      vis: {
        data: {},
      },
    } as VisualizeRuntimeState;
  let serializedState = cloneDeep(state.rawState);
  if (isVisualizeSavedObjectState(serializedState)) {
    serializedState = await deserializeSavedObjectState(serializedState);
  }

  const references: Reference[] = state.references ?? [];

  const deserializedSavedVis = deserializeSavedVisState(serializedState, references);
  const vis = await createVisAsync(deserializedSavedVis.type, deserializedSavedVis);

  return {
    ...serializedState,
    vis,
  } as VisualizeRuntimeState;
};

export const deserializeSavedVisState = (
  serializedState: VisualizeSavedVisInputState,
  references: Reference[]
) => {
  const { data } = serializedState.savedVis ?? { data: {} };
  let serializedSearchSource = data.searchSource as SerializedSearchSourceFields & {
    indexRefName: string;
  };
  if (references.some((ref) => ref.id) && !('indexRefName' in data.searchSource)) {
    // due to a bug in 8.0, some visualizations were saved with an injected state - re-extract in that case and inject the upstream references because they might have changed
    serializedSearchSource = extractSearchSourceReferences(
      serializedSearchSource
    )[0] as SerializedSearchSourceFields & {
      indexRefName: string;
    };
  }
  const { references: deserializedReferences, deserializedSearchSource } = deserializeReferences(
    {
      ...serializedState,
      savedVis: {
        ...serializedState.savedVis,
        data: { ...data, searchSource: serializedSearchSource },
      },
    },
    references
  );

  return {
    ...serializedState.savedVis,
    data: {
      ...data,
      searchSource: deserializedSearchSource,
      savedSearchId: deserializedReferences.find((r) => r.name === 'search_0')?.id,
    },
  };
};

export const deserializeSavedObjectState = async (state: VisualizeSavedObjectInputState) => {
  const { title, description, visState, searchSource, searchSourceFields, savedSearchId } =
    await getSavedVisualization(
      {
        dataViews: getDataViews(),
        search: getSearch(),
        savedObjectsTagging: getSavedObjectTagging().getTaggingApi(),
        spaces: getSpaces(),
        i18n: getI18n(),
        overlays: getOverlays(),
        analytics: getAnalytics(),
        theme: getTheme(),
      },
      state.savedObjectId
    );

  return {
    savedVis: {
      title,
      type: visState.type,
      params: visState.params,
      data: {
        aggs: visState.aggs,
        searchSource: (searchSource ?? searchSourceFields) as SerializedSearchSourceFields,
        savedSearchId,
      },
    },
    title,
    description,
  };
};

export const serializeState = ({
  serializedVis, // Serialize the vis before passing it to this function for easier testing
  titles,
}: {
  serializedVis: SerializedVis;
  titles: SerializedTitles;
}) => {
  const { references, serializedSearchSource } = serializeReferences(serializedVis);
  return {
    rawState: {
      ...titles,
      savedVis: {
        ...serializedVis,
        data: {
          ...omit(serializedVis.data, 'savedSearchId'),
          searchSource: serializedSearchSource,
          ...(serializedVis.data.savedSearchId
            ? {
                savedSearchRefName: references.find(
                  (r) => r.id === serializedVis.data.savedSearchId
                ),
              }
            : {}),
        },
      },
    },
    references,
  };
};
