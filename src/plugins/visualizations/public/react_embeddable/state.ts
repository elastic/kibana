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
import {
  isVisualizeSavedObjectState,
  VisualizeSavedObjectState,
  VisualizeSerializedState,
} from './types';

export const deserializeState = (
  state:
    | SerializedPanelState<VisualizeSerializedState | VisualizeSavedObjectState>
    | { rawState: undefined }
) => {
  if (!state.rawState)
    return {
      id: '',
      savedVis: {
        data: {},
      },
    } as VisualizeSerializedState;
  const serializedState = cloneDeep(state.rawState);
  if (isVisualizeSavedObjectState(serializedState)) {
    // Defer deserialization to the embeddable factory, as it requires an async call
    return { ...serializedState, references: state.references };
  }

  const references: Reference[] = state.references ?? [];

  const { data } = serializedState.savedVis ?? { data: {} };
  let serializedSearchSource = data.searchSource as SerializedSearchSourceFields & {
    indexRefName: string;
  };
  if (
    data.searchSource.index &&
    references.some((ref) => ref.id === data.searchSource.index) &&
    !('indexRefName' in data.searchSource)
  ) {
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
    ...serializedState,
    savedVis: {
      ...serializedState.savedVis,
      data: {
        ...data,
        searchSource: deserializedSearchSource,
        savedSearchId: deserializedReferences.find((r) => r.name === 'search_0')?.id,
      },
    },
  } as VisualizeSerializedState;
};

export const deserializeSavedObjectState = async (state: VisualizeSavedObjectState) => {
  const {
    title,
    description,
    id = state.id,
    visState,
    searchSource,
    searchSourceFields,
    savedSearchId,
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
    state.savedObjectId
  );

  return deserializeState({
    rawState: {
      id,
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
    },
    references: state.references,
  }) as VisualizeSerializedState;
};

export const serializeState = ({
  savedVis,
  id,
  titles,
}: {
  savedVis: SerializedVis;
  id: string;
  titles: SerializedTitles;
}) => {
  const { references, serializedSearchSource } = serializeReferences(savedVis);
  return {
    rawState: {
      ...titles,
      id,
      savedVis: {
        ...savedVis,
        data: {
          ...omit(savedVis.data, 'savedSearchId'),
          searchSource: serializedSearchSource,
          ...(savedVis.data.savedSearchId
            ? {
                savedSearchRefName: references.find((r) => r.id === savedVis.data.savedSearchId),
              }
            : {}),
        },
      },
    },
    references,
  };
};
