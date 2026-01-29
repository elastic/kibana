/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreStart, DocLinksStart } from '@kbn/core/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { EsqlPluginStart } from './plugin';

export let core: CoreStart;

export interface ServiceDeps {
  core: CoreStart;
  data: DataPublicPluginStart;
  storage: Storage;
  uiActions: UiActionsStart;
  fieldsMetadata?: FieldsMetadataPublicStart;
  usageCollection?: UsageCollectionStart;
  esql: EsqlPluginStart;
  docLinks: DocLinksStart;
  kql: KqlPluginStart;
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
  esql: EsqlPluginStart,
  kibanaCore: CoreStart,
  data: DataPublicPluginStart,
  storage: Storage,
  uiActions: UiActionsStart,
  kql: KqlPluginStart,
  fieldsMetadata?: FieldsMetadataPublicStart,
  usageCollection?: UsageCollectionStart
) => {
  core = kibanaCore;
  servicesReady$.next({
    core,
    data,
    storage,
    uiActions,
    fieldsMetadata,
    usageCollection,
    docLinks: core.docLinks,
    esql,
    kql,
  });
};
