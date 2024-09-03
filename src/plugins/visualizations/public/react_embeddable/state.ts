/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import { extractSearchSourceReferences } from '@kbn/data-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { SerializedTitles } from '@kbn/presentation-publishing';
import { cloneDeep, isEmpty, omit } from 'lodash';
import { Reference } from '../../common/content_management';
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
import {
  isVisualizeSavedObjectState,
  VisualizeSavedObjectInputState,
  VisualizeSerializedState,
  VisualizeRuntimeState,
  VisualizeSavedVisInputState,
  ExtraSavedObjectProperties,
  isVisualizeRuntimeState,
} from './types';

export const deserializeState = async (
  state: SerializedPanelState<VisualizeSerializedState> | { rawState: undefined }
) => {
  if (!state.rawState)
    return {
      serializedVis: {
        data: {},
      },
    } as VisualizeRuntimeState;
  let serializedState = cloneDeep(state.rawState);
  if (isVisualizeSavedObjectState(serializedState)) {
    serializedState = await deserializeSavedObjectState(serializedState);
  } else if (isVisualizeRuntimeState(serializedState)) {
    return serializedState as VisualizeRuntimeState;
  }

  const references: Reference[] = state.references ?? [];

  const deserializedSavedVis = deserializeSavedVisState(serializedState, references);

  return {
    ...serializedState,
    serializedVis: deserializedSavedVis,
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
  let serializedReferences = [...references];
  if (data.searchSource && !('indexRefName' in data.searchSource)) {
    // due to a bug in 8.0, some visualizations were saved with an injected state - re-extract in that case and inject the upstream references because they might have changed
    const [extractedSearchSource, extractedReferences] =
      extractSearchSourceReferences(serializedSearchSource);

    serializedSearchSource = extractedSearchSource as SerializedSearchSourceFields & {
      indexRefName: string;
    };
    serializedReferences = [...references, ...extractedReferences];
  }

  const { references: deserializedReferences, deserializedSearchSource } = deserializeReferences(
    {
      ...serializedState,
      savedVis: {
        ...serializedState.savedVis,
        data: { ...data, searchSource: serializedSearchSource },
      },
    },
    serializedReferences
  );

  return {
    ...serializedState.savedVis,
    data: {
      ...data,
      searchSource: deserializedSearchSource,
      savedSearchId:
        deserializedReferences.find((r) => r.name === 'search_0')?.id ?? data.savedSearchId,
    },
  };
};

export const deserializeSavedObjectState = async ({
  savedObjectId,
  enhancements,
  uiState,
  timeRange,
}: VisualizeSavedObjectInputState) => {
  // Load a saved visualization from the library
  const {
    title,
    description,
    visState,
    searchSource,
    searchSourceFields,
    savedSearchId,
    savedSearchRefName,
    uiStateJSON,
    ...savedObjectProperties
  } = await getSavedVisualization(
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
    savedObjectId
  );
  return {
    savedVis: {
      title,
      type: visState.type,
      params: visState.params,
      uiState: uiState ?? (uiStateJSON ? JSON.parse(uiStateJSON) : {}),
      data: {
        aggs: visState.aggs,
        searchSource: (searchSource ?? searchSourceFields) as SerializedSearchSourceFields,
        savedSearchId,
      },
    },
    title,
    description,
    savedObjectId,
    savedObjectProperties,
    linkedToLibrary: true,
    ...(timeRange ? { timeRange } : {}),
    ...(enhancements ? { enhancements } : {}),
  } as VisualizeSavedVisInputState;
};

export const serializeState: (props: {
  serializedVis: SerializedVis;
  titles: SerializedTitles;
  id?: string;
  savedObjectProperties?: ExtraSavedObjectProperties;
  linkedToLibrary?: boolean;
  enhancements?: VisualizeRuntimeState['enhancements'];
  timeRange?: VisualizeRuntimeState['timeRange'];
}) => Required<SerializedPanelState<VisualizeSerializedState>> = ({
  serializedVis, // Serialize the vis before passing it to this function for easier testing
  titles,
  id,
  savedObjectProperties,
  linkedToLibrary,
  enhancements,
  timeRange,
}) => {
  const titlesWithDefaults = {
    title: '',
    description: '',
    ...titles,
  };
  const { references, serializedSearchSource } = serializeReferences(serializedVis);

  // Serialize ONLY the savedObjectId. This ensures that when this vis is loaded again, it will always fetch the
  // latest revision of the saved object
  if (linkedToLibrary) {
    return {
      rawState: {
        savedObjectId: id,
        ...(enhancements ? { enhancements } : {}),
        ...(!isEmpty(serializedVis.uiState) ? { uiState: serializedVis.uiState } : {}),
        ...(timeRange ? { timeRange } : {}),
      } as VisualizeSavedObjectInputState,
      references,
    };
  }

  const savedSearchRefName = serializedVis.data.savedSearchId
    ? references.find((r) => r.id === serializedVis.data.savedSearchId)?.name
    : undefined;

  return {
    rawState: {
      ...titlesWithDefaults,
      ...savedObjectProperties,
      ...(enhancements ? { enhancements } : {}),
      ...(timeRange ? { timeRange } : {}),
      savedVis: {
        ...serializedVis,
        id,
        data: {
          ...omit(serializedVis.data, 'savedSearchId'),
          searchSource: serializedSearchSource,
          ...(savedSearchRefName
            ? {
                savedSearchRefName,
              }
            : {}),
        },
      },
    } as VisualizeSavedVisInputState,
    references,
  };
};
