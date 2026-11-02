/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared sample annotation groups used by the event-annotation listing
 * Scout specs. Hoisted into the fixtures module so spec files can't drift
 * on shape (the `kbnClient.savedObjects.create` payloads have to stay in
 * lockstep with the `event-annotation-group` saved-object schema).
 */

/** Stable data view id used as the `indexPatternId` reference for samples. */
export const SAMPLE_DATA_VIEW_ID = 'sample-logs-data-view';

/** Display name for the sample data view above. */
export const SAMPLE_DATA_VIEW_NAME = 'logs*';

/** Stable saved-object tag id used by tag-filter coverage. */
export const SAMPLE_TAG_ID = 'sample-annotation-tag';

/** Display name for the sample tag above. */
export const SAMPLE_TAG_NAME = 'tag';

export const getSampleDataViewId = (spaceId: string) => `${SAMPLE_DATA_VIEW_ID}-${spaceId}`;

export const getSampleTagId = (spaceId: string) => `${SAMPLE_TAG_ID}-${spaceId}`;

/** A minimal `event-annotation-group` saved-object reference list pointing at the sample data view. */
export const buildSampleDvReferences = (dataViewId: string) => [
  {
    id: dataViewId,
    name: `event-annotation-group_dataView-ref-${dataViewId}`,
    type: 'index-pattern',
  },
];

/** Saved-object references for a sample group associated with the sample tag. */
export const buildSampleTaggedReferences = (dataViewId: string, tagId: string) => [
  ...buildSampleDvReferences(dataViewId),
  {
    id: tagId,
    name: SAMPLE_TAG_NAME,
    type: 'tag',
  },
];

/**
 * Build a minimal `event-annotation-group` attributes payload. Empty
 * `annotations` is fine for listing-only coverage — the listing UI only
 * reads `title`, `description`, and the data-view reference.
 */
export const buildAnnotationGroupAttrs = (overrides: { title: string; description?: string }) => ({
  title: overrides.title,
  description: overrides.description ?? '',
  annotations: [],
  dataViewSpec: null,
  ignoreGlobalFilters: true,
});

/** Title used by read-only listing specs. */
export const GROUP_ALPHA = { title: 'Alpha annotation group', description: 'First test group' };

/** Title used by read-only listing specs. */
export const GROUP_BETA = { title: 'Beta annotation group', description: 'Second test group' };

/** Group used to mirror the legacy FTR search behavior checks. */
export const GROUP_SEARCH = {
  title: 'search for annotation',
  description: 'i have a description',
};

/** Group used by row-delete and tag-filter coverage. */
export const GROUP_TAGGED_DELETE = {
  title: 'to delete tagged annotation',
  description: 'tagged group',
};
