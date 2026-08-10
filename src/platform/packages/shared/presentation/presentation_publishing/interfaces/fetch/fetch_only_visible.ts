/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../..';

export type FetchSetting = 'visible' | 'all';

/**
 * Parent APIs can publish a fetch setting that determines when child components should fetch data.
 */
export interface PublishesFetchSetting {
  fetchSetting$: PublishingSubject<FetchSetting>;
}

export const apiPublishesFetchSetting = (
  unknownApi?: unknown
): unknownApi is PublishesFetchSetting => {
  return Boolean(unknownApi && (unknownApi as PublishesFetchSetting)?.fetchSetting$ !== undefined);
};

export interface PublishesIsVisible {
  isVisible$: PublishingSubject<boolean>;
}

export const apiPublishesIsVisible = (unknownApi?: unknown): unknownApi is PublishesIsVisible => {
  return Boolean(unknownApi && (unknownApi as PublishesIsVisible)?.isVisible$ !== undefined);
};