/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

export let core: CoreStart;

interface ServiceDeps {
  core: CoreStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
}

const servicesReady$ = new BehaviorSubject<ServiceDeps | undefined>(undefined);
export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve(servicesReady$.value);
  return new Promise<ServiceDeps>((resolve) => {
    const subscription = servicesReady$.subscribe((deps) => {
      if (deps) {
        subscription.unsubscribe();
        resolve(deps);
      }
    });
  });
};

export const setKibanaServices = (
  kibanaCore: CoreStart,
  data: DataPublicPluginStart,
  uiActions: UiActionsStart,
  fieldFormats: FieldFormatsStart
) => {
  core = kibanaCore;
  servicesReady$.next({
    core,
    data,
    uiActions,
    fieldFormats,
  });
};
