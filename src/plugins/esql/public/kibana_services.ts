/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { IndexManagementPluginSetup } from '@kbn/index-management-shared-types';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

export let core: CoreStart;

interface ServiceDeps {
  core: CoreStart;
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  indexManagementApiService?: IndexManagementPluginSetup['apiService'];
  fieldsMetadata?: FieldsMetadataPublicStart;
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
  indexManagement?: IndexManagementPluginSetup,
  fieldsMetadata?: FieldsMetadataPublicStart
) => {
  core = kibanaCore;
  servicesReady$.next({
    core,
    dataViews,
    expressions,
    indexManagementApiService: indexManagement?.apiService,
    fieldsMetadata,
  });
};
