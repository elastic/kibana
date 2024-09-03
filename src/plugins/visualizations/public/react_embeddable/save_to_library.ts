/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '../../common/content_management';
import { PersistedState } from '../persisted_state';
import { getAnalytics, getI18n, getOverlays, getTheme } from '../services';
import { saveVisualization } from '../utils/saved_visualize_utils';
import { VisualizeOutputState } from './types';

export const saveToLibrary = async ({
  uiState,
  rawState,
  references,
}: {
  uiState: PersistedState;
  rawState: VisualizeOutputState;
  references: Reference[];
}) => {
  const {
    savedVis: serializedVis,
    title,
    description,
    getDisplayName,
    getEsType,
    managed,
  } = rawState;

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
    ...(serializedVis.data.savedSearchRefName
      ? { savedSearchRefName: String(serializedVis.data.savedSearchRefName) }
      : {}),
    searchSourceFields: serializedVis.data.searchSource,
    uiStateJSON: uiState.toString(),
    lastSavedTitle: '',
    displayName: title,
    getDisplayName,
    getEsType,
    managed,
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
    },
    references ?? []
  );
  return libraryId;
};
