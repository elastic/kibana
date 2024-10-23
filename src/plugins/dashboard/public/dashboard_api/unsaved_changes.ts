/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { DashboardContainerInput } from '../../common';

export function initializeUnsavedChanges(
  anyMigrationRun: boolean,
  lastSavedInput: DashboardContainerInput
) {
  const hasRunMigrations$ = new BehaviorSubject(anyMigrationRun);
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const lastSavedInput$ = new BehaviorSubject<DashboardContainerInput>(lastSavedInput);

  return {
    hasRunMigrations$,
    hasUnsavedChanges$,
    lastSavedInput$,
    setHasUnsavedChanges: (hasUnsavedChanges: boolean) =>
      hasUnsavedChanges$.next(hasUnsavedChanges),
    setLastSavedInput: (input: DashboardContainerInput) => {
      lastSavedInput$.next(input);

      // if we set the last saved input, it means we have saved this Dashboard - therefore clientside migrations have
      // been serialized into the SO.
      hasRunMigrations$.next(false);
    },
  };
}
