/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

const servicesReady$ = new BehaviorSubject(false);

/**
 * Resolves when the plugin start has run and the trigger registry has finished
 * all pending async validations (getAllTriggerDefinitions() returns the full list).
 * Use this before reading the trigger list (e.g. in the actions menu).
 */
export const untilPluginStartServicesReady = (): Promise<void> => {
  if (servicesReady$.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};

/**
 * Called by the plugin from start(). When the given whenReady promise resolves,
 * services are considered ready.
 */
export const setStartServices = (whenReady: () => Promise<void>): void => {
  whenReady().then(() => {
    servicesReady$.next(true);
  });
};
