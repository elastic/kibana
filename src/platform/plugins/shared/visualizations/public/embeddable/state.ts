/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import { isEmpty } from 'lodash';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type {
  VisualizeByReferenceState,
  VisualizeByValueState,
  VisualizeEmbeddableState,
} from '../../common/embeddable/types';
import {
  getAnalytics,
  getDataViews,
  getI18n,
  getOverlays,
  getSavedObjectTagging,
  getSearch,
  getSpaces,
  getTheme,
  getUserProfile,
} from '../services';
import { getSavedVisualization } from '../utils/saved_visualize_utils';
import type { SerializedVis } from '../vis';
import type { VisualizeRuntimeState, ExtraSavedObjectProperties } from './types';

export const deserializeState = async (state: VisualizeEmbeddableState | undefined) => {
  if (!state)
    return {
      serializedVis: {
        data: {},
      },
    } as VisualizeRuntimeState;

  if ((state as VisualizeByReferenceState).savedObjectId) {
    return await deserializeSavedObjectState(state as VisualizeByReferenceState);
  }

  const { savedVis, ...rest } = state as VisualizeByValueState;
  return {
    ...rest,
    serializedVis: savedVis,
  };
};

export const deserializeSavedObjectState = async ({
  savedObjectId,
  drilldowns,
  uiState,
  time_range,
  title: embeddableTitle,
  description: embeddableDescription,

  hide_title,
}: VisualizeByReferenceState) => {
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
      userProfile: getUserProfile(),
    },
    savedObjectId
  );

  const panelTitle = embeddableTitle ?? title;
  const panelDescription = embeddableDescription ?? description;
  return {
    serializedVis: {
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
    title: panelTitle,
    description: panelDescription,
    hide_title,
    savedObjectId,
    savedObjectProperties,
    linkedToLibrary: true,
    ...(time_range ? { time_range } : {}),
    ...(drilldowns ? { drilldowns } : {}),
  } as VisualizeRuntimeState;
};

export const serializeState: (props: {
  serializedVis: SerializedVis;
  titles?: SerializedTitles;
  id?: string;
  savedObjectProperties?: ExtraSavedObjectProperties;
  linkedToLibrary?: boolean;
  drilldowns?: SerializedDrilldowns;
  time_range?: VisualizeRuntimeState['time_range'];
}) => VisualizeEmbeddableState = ({
  serializedVis, // Serialize the vis before passing it to this function for easier testing
  titles,
  id,
  savedObjectProperties,
  linkedToLibrary,
  drilldowns,
  time_range,
}) => {
  // save by reference
  if (linkedToLibrary && id) {
    return {
      ...(titles ? titles : {}),
      ...(drilldowns ? drilldowns : {}),
      ...(!isEmpty(serializedVis.uiState) ? { uiState: serializedVis.uiState } : {}),
      ...(time_range ? { time_range } : {}),
      savedObjectId: id,
    } as VisualizeByReferenceState;
  }

  return {
    ...(titles ? titles : {}),
    ...savedObjectProperties,
    ...(drilldowns ? drilldowns : {}),
    ...(time_range ? { time_range } : {}),
    savedVis: {
      ...serializedVis,
      id,
    },
  } as VisualizeByValueState;
};
