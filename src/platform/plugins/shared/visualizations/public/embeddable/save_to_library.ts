/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PersistedState } from '../persisted_state';
import { getAnalytics, getI18n, getOverlays, getTheme, getUserProfile } from '../services';
import { saveVisualization } from '../utils/saved_visualize_utils';
import type { SerializedVis } from '../vis';

export const saveToLibrary = async ({
  description,
  title,
  serializedVis,
  uiState,
}: {
  description: string | undefined;
  serializedVis: SerializedVis;
  title: string;
  uiState: PersistedState;
}) => {
  const visSavedObjectAttributes = {
    title,
    description,
    visState: {
      type: serializedVis.type,
      params: serializedVis.params,
      aggs: serializedVis.data.aggs,
      title: serializedVis.title,
    },
    savedSearchId: serializedVis.data.savedSearchId,
    searchSourceFields: serializedVis.data.searchSource,
    uiStateJSON: uiState.toString(),
    lastSavedTitle: '',
    displayName: title,
  };

  const libraryId = await saveVisualization(
    visSavedObjectAttributes,
    {
      confirmOverwrite: false,
    },
    {
      analytics: getAnalytics(),
      i18n: getI18n(),
      overlays: getOverlays(),
      theme: getTheme(),
      userProfile: getUserProfile(),
    },
    []
  );
  return libraryId;
};
