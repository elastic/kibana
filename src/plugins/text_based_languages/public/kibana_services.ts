/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { IndexManagementPluginSetup } from '@kbn/index-management';

export let core: CoreStart;

interface ServiceDeps {
  core: CoreStart;
  darkMode: boolean;
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  getAllEnrichPolicies: IndexManagementPluginSetup['apiService']['getAllEnrichPolicies'];
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
  dataViews: DataViewsPublicPluginStart,
  expressions: ExpressionsStart,
  indexManagement?: IndexManagementPluginSetup
) => {
  core = kibanaCore;
  const getAllEnrichPolicies = indexManagement
    ? indexManagement?.apiService.getAllEnrichPolicies
    : async () => ({ data: null, error: null });
  core.theme.theme$.subscribe(({ darkMode }) => {
    servicesReady$.next({
      core,
      darkMode,
      dataViews,
      expressions,
      getAllEnrichPolicies,
    });
  });
};
