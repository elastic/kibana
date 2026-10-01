/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../..';

/**
 * Parent APIs can publish a fetch setting that determines when child components should fetch data.
 */
export interface PublishesFetchOnlyVisible {
  fetchOnlyVisible$: PublishingSubject<boolean>;
}

export const apiPublishesFetchOnlyVisible = (
  unknownApi?: unknown
): unknownApi is PublishesFetchOnlyVisible => {
  return Boolean(
    unknownApi && (unknownApi as PublishesFetchOnlyVisible)?.fetchOnlyVisible$ !== undefined
  );
};
