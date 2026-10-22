/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableSource } from '@kbn/data-source';
import type { PublishingSubject } from '../publishing_subject';

/**
 * This API publishes the sources (data views or ES|QL datasets) that its filters and queries apply to.
 * A container publishes the union of its children's `dataViews$` and `filterableSources$`, so filter UI
 * reads this list only. Code that needs a real `DataView` reads `dataViews$` only.
 */
export interface PublishesFilterableSources {
  filterableSources$: PublishingSubject<FilterableSource[] | undefined>;
}

export const apiPublishesFilterableSources = (
  unknownApi: null | unknown
): unknownApi is PublishesFilterableSources => {
  return Boolean(
    unknownApi && (unknownApi as PublishesFilterableSources)?.filterableSources$ !== undefined
  );
};
