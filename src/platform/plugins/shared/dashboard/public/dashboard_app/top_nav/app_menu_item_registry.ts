/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import type { ViewMode } from '@kbn/presentation-publishing';

export interface DashboardAppMenuItemContext {
  viewMode: ViewMode;
}

/**
 * Optional extra App Menu items contributed by other plugins (e.g. Agent Builder).
 * Return `undefined` to omit the item for the current context.
 */
export type DashboardAppMenuItemGenerator = (
  context: DashboardAppMenuItemContext
) => AppMenuItemType | undefined;

const appMenuItemGenerators$ = new BehaviorSubject<DashboardAppMenuItemGenerator[]>([]);

export const getAppMenuItemGenerators$ = () => appMenuItemGenerators$.asObservable();

export const registerAppMenuItemGenerator = (
  generator: DashboardAppMenuItemGenerator
): (() => void) => {
  appMenuItemGenerators$.next([...appMenuItemGenerators$.value, generator]);
  return () => {
    appMenuItemGenerators$.next(appMenuItemGenerators$.value.filter((g) => g !== generator));
  };
};

export const getRegisteredAppMenuItems = (
  context: DashboardAppMenuItemContext
): AppMenuItemType[] =>
  appMenuItemGenerators$.value
    .map((generator) => generator(context))
    .filter((item): item is AppMenuItemType => item !== undefined);
