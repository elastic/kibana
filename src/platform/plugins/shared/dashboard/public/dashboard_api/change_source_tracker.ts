/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_CHANGE_SOURCES, type DashboardChangeSource } from '../../common/change_sources';

/** For each change source, the number of the latest change it made to a dashboard state. */
export type LatestChangeBySource = Readonly<Partial<Record<DashboardChangeSource, number>>>;

export type ChangeSourceTracker = ReturnType<typeof initializeChangeSourceTracker>;

/**
 * Tracks which integrations changed the dashboard since its last save.
 *
 * Every labeled change gets the next number. A dashboard state remembers, for each source, the
 * number of the latest change that source made. A save includes a source when that number is
 * newer than at the previous save. Undo history stores these numbers with every snapshot, so an
 * undone change is not reported. Numbers never repeat, so a change made after an undo is always
 * newer than the last save.
 */
export const initializeChangeSourceTracker = (
  initialSources: readonly DashboardChangeSource[] = []
) => {
  let lastChangeNumber = 0;
  let current: LatestChangeBySource = {};
  let saved: LatestChangeBySource = {};

  const getSourcesChangedSinceSave = (state: LatestChangeBySource) =>
    DASHBOARD_CHANGE_SOURCES.filter((source) => (state[source] ?? 0) > (saved[source] ?? 0));

  const recordChange = (sources: readonly DashboardChangeSource[]) => {
    if (sources.length === 0) return;
    lastChangeNumber++;
    current = {
      ...current,
      ...Object.fromEntries(sources.map((source) => [source, lastChangeNumber])),
    };
  };
  recordChange(initialSources);

  return {
    recordChange,
    getLatestChanges: () => current,
    restoreLatestChanges: (state: LatestChangeBySource) => {
      current = state;
    },
    resetToSaved: () => {
      current = saved;
    },
    getUnsavedSources: () => getSourcesChangedSinceSave(current),
    /** Records a successful save of `state` and returns the sources it includes. */
    markSaved: (state: LatestChangeBySource) => {
      const sources = getSourcesChangedSinceSave(state);
      saved = state;
      return sources;
    },
  };
};
