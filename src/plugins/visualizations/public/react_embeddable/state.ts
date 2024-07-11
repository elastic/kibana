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
import { VisualizationSavedObject } from '../../common';
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
import { getSavedVisualization, SAVED_VIS_TYPE } from '../utils/saved_visualize_utils';
import type { SerializedVis } from '../vis';
import {
  isVisualizeSavedObjectState,
  VisualizeSavedObjectInputState,
  VisualizeSerializedState,
  VisualizeRuntimeState,
  VisualizeSavedVisInputState,
  ExtraSavedObjectProperties,
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
  if (!('indexRefName' in data.searchSource)) {
    // due to a bug in 8.0, some visualizations were saved with an injected state - re-extract in that case and inject the upstream references because they might have changed
    const [newSearchSource, newReferences] = extractSearchSourceReferences(serializedSearchSource);

    serializedSearchSource = newSearchSource as SerializedSearchSourceFields & {
      indexRefName: string;
    };
    serializedReferences = [
      ...references.filter((r) => r.name !== serializedSearchSource.indexRefName),
      ...newReferences,
    ];
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

export const deserializeSavedObjectState = async (state: VisualizeSavedObjectInputState) => {
  // Load a saved visualization from the library
  const {
    title,
    description,
    visState,
    searchSource,
    searchSourceFields,
    savedSearchId,
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
    savedObjectId: state.savedObjectId,
    savedObjectProperties,
    linkedToLibrary: true,
  } as VisualizeSavedVisInputState;
};

export const serializeState = ({
  serializedVis, // Serialize the vis before passing it to this function for easier testing
  titles,
  id,
  savedObjectProperties,
  linkedToLibrary,
}: {
  serializedVis: SerializedVis;
  titles: SerializedTitles;
  id?: string;
  savedObjectProperties?: ExtraSavedObjectProperties;
  linkedToLibrary?: boolean;
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
      } as VisualizeSavedObjectInputState,
      references,
    };
  }

  return {
    rawState: {
      ...titlesWithDefaults,
      ...savedObjectProperties,
      savedVis: {
        ...serializedVis,
        id,
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

export const savedObjectToRuntimeState: (
  savedObject: VisualizationSavedObject
) => VisualizeRuntimeState = (savedObject) => {
  const { references, attributes, id, managed = false } = savedObject;

  const { title, description, visState: visStateJSON, kibanaSavedObjectMeta } = attributes;

  const visState = JSON.parse(visStateJSON ?? '{}');
  const { searchSourceJSON } = kibanaSavedObjectMeta ?? {};
  const searchSource = searchSourceJSON
    ? JSON.parse(searchSourceJSON)
    : getSearch().searchSource.createEmpty();

  return {
    serializedVis: deserializeSavedVisState(
      {
        savedVis: {
          title,
          description,
          type: visState.type,
          params: visState.params,
          data: {
            aggs: visState.aggs,
            searchSource,
            savedSearchId: visState.savedSearchId,
          },
        },
      } as VisualizeSavedVisInputState,
      references
    ),
    linkedToLibrary: true,
    savedObjectId: id,
    savedObjectProperties: {
      lastSavedTitle: title,
      displayName: SAVED_VIS_TYPE,
      getDisplayName: () => SAVED_VIS_TYPE,
      getEsType: () => SAVED_VIS_TYPE,
      managed,
    },
  };
};
