/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { DataViewsContract, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import type { AutocompleteStart } from '@kbn/kql/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { EsqlPluginStart } from '@kbn/esql/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';

export const [getCoreStart, setCoreStart] = createGetterSetter<CoreStart>('CoreStart');

export const [getIndexPatterns, setIndexPatterns] =
  createGetterSetter<DataViewsContract>('IndexPatterns');

/**
 * Services the dashboard search bar closes over in `createSearchBar`. Panel-level filters render
 * in a system flyout, outside that app context, so they read the same services from here.
 */
export interface PanelLevelFiltersServices {
  core: CoreStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  storage: IStorageWrapper;
  kql: { autocomplete: AutocompleteStart };
  usageCollection?: UsageCollectionSetup;
  cps: CPSPluginStart;
  esql?: EsqlPluginStart;
  licensing?: LicensingPluginStart;
}

let panelLevelFiltersServices: PanelLevelFiltersServices | undefined;

export const setPanelLevelFiltersServices = (services: PanelLevelFiltersServices) => {
  panelLevelFiltersServices = services;
};

export const getPanelLevelFiltersServices = (): PanelLevelFiltersServices | undefined =>
  panelLevelFiltersServices;
