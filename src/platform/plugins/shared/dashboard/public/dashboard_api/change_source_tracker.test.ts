/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeChangeSourceTracker } from './change_source_tracker';

describe('changeSourceTracker', () => {
  it('reports the initial sources on the first save only', () => {
    const tracker = initializeChangeSourceTracker(['agent']);

    expect(tracker.markSaved(tracker.getLatestChanges())).toEqual(['agent']);
    expect(tracker.markSaved(tracker.getLatestChanges())).toEqual([]);
  });

  it('reports a recorded change on the next save', () => {
    const tracker = initializeChangeSourceTracker();
    tracker.recordChange([]);
    expect(tracker.getUnsavedSources()).toEqual([]);

    tracker.recordChange(['agent']);

    expect(tracker.getUnsavedSources()).toEqual(['agent']);
    expect(tracker.markSaved(tracker.getLatestChanges())).toEqual(['agent']);
    expect(tracker.getUnsavedSources()).toEqual([]);
  });

  it('does not report an undone change, and reports it again once redone', () => {
    const tracker = initializeChangeSourceTracker();
    const beforeChange = tracker.getLatestChanges();
    tracker.recordChange(['agent']);
    const afterChange = tracker.getLatestChanges();

    tracker.restoreLatestChanges(beforeChange);
    expect(tracker.getUnsavedSources()).toEqual([]);

    tracker.restoreLatestChanges(afterChange);
    expect(tracker.markSaved(tracker.getLatestChanges())).toEqual(['agent']);
  });

  it('reports a change made after undoing past a save', () => {
    const tracker = initializeChangeSourceTracker();
    const beforeChange = tracker.getLatestChanges();
    tracker.recordChange(['agent']);
    tracker.markSaved(tracker.getLatestChanges());

    tracker.restoreLatestChanges(beforeChange);
    tracker.recordChange(['agent']);

    expect(tracker.markSaved(tracker.getLatestChanges())).toEqual(['agent']);
  });

  it('drops unsaved changes on reset to the last saved state', () => {
    const tracker = initializeChangeSourceTracker(['agent']);

    tracker.resetToSaved();

    expect(tracker.getUnsavedSources()).toEqual([]);
  });

  it('reports the changes a save captured, not later ones', () => {
    const tracker = initializeChangeSourceTracker();
    const inSave = tracker.getLatestChanges();
    tracker.recordChange(['agent']);

    expect(tracker.markSaved(inSave)).toEqual([]);
    expect(tracker.markSaved(tracker.getLatestChanges())).toEqual(['agent']);
  });
});
