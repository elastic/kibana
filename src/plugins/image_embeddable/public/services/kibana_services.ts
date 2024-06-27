/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { CoreStart } from '@kbn/core/public';
import { FilesStart } from '@kbn/files-plugin/public';
import { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';

import { ImageEmbeddableStartDependencies } from '../plugin';

export let coreServices: CoreStart;
export let filesService: FilesStart;
export let uiActionsService: UiActionsStart;
export let screenshotModeService: ScreenshotModePluginStart | undefined;

export let trackUiMetric: (
  type: string,
  eventNames: string | string[],
  count?: number
) => void | undefined;

const servicesReady$ = new BehaviorSubject(false);

export const untilPluginStartServicesReady = () => {
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

export const setKibanaServices = (
  kibanaCore: CoreStart,
  deps: ImageEmbeddableStartDependencies
) => {
  coreServices = kibanaCore;
  filesService = deps.files;
  uiActionsService = deps.uiActions;
  screenshotModeService = deps.screenshotMode;

  servicesReady$.next(true);
};
