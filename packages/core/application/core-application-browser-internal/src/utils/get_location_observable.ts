/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, Subject, startWith, shareReplay, distinctUntilChanged } from 'rxjs';
import type { History } from 'history';

// interface compatible for both window.location and history.location...
export interface Location {
  pathname: string;
  hash: string;
}

export const getLocationObservable = (
  initialLocation: Location,
  history: History
): Observable<string> => {
  const subject = new Subject<string>();
  history.listen((location) => {
    subject.next(locationToUrl(location));
  });
  return subject.pipe(
    startWith(locationToUrl(initialLocation)),
    distinctUntilChanged(),
    shareReplay(1)
  );
};

const locationToUrl = (location: Location) => {
  return `${location.pathname}${location.hash}`;
};
