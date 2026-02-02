/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

export interface PublishesPauseFetch {
  isFetchPaused$: Observable<boolean>;
}

export interface PublishesEditablePauseFetch extends PublishesPauseFetch {
  setFetchPaused: (paused: boolean) => void;
}

export const apiPublishesPauseFetch = (
  unknownApi: null | unknown
): unknownApi is PublishesPauseFetch => {
  return Boolean(unknownApi && (unknownApi as PublishesPauseFetch)?.isFetchPaused$ !== undefined);
};

export const apiPublishesEditablePauseFetch = (
  unknownApi: null | unknown
): unknownApi is PublishesEditablePauseFetch => {
  return (
    apiPublishesPauseFetch(unknownApi) &&
    typeof (unknownApi as PublishesEditablePauseFetch)?.setFetchPaused === 'function'
  );
};
