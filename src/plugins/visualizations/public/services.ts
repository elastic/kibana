/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ApplicationStart,
  Capabilities,
  ChromeStart,
  HttpStart,
  IUiSettingsClient,
  OverlayStart,
  SavedObjectsStart,
  DocLinksStart,
} from 'src/core/public';
import { createGetterSetter } from 'src/plugins/kibana_utils/public';
import { DataPublicPluginStart, TimefilterContract } from 'src/plugins/data/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { ExpressionsStart } from 'src/plugins/expressions/public';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { SavedObjectLoader } from 'src/plugins/saved_objects/public';
import { EmbeddableStart } from 'src/plugins/embeddable/public';
import { SavedVisualizationsLoader } from './saved_visualizations';
import { TypesStart } from './vis_types';

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [getCapabilities, setCapabilities] = createGetterSetter<Capabilities>('Capabilities');

export const [getHttp, setHttp] = createGetterSetter<HttpStart>('Http');

export const [getApplication, setApplication] = createGetterSetter<ApplicationStart>('Application');

export const [getEmbeddable, setEmbeddable] = createGetterSetter<EmbeddableStart>('Embeddable');

export const [getSavedObjects, setSavedObjects] = createGetterSetter<SavedObjectsStart>(
  'SavedObjects'
);

export const [getTypes, setTypes] = createGetterSetter<TypesStart>('Types');

export const [getDocLinks, setDocLinks] = createGetterSetter<DocLinksStart>('DocLinks');

export const [getTimeFilter, setTimeFilter] = createGetterSetter<TimefilterContract>('TimeFilter');

export const [getSearch, setSearch] = createGetterSetter<DataPublicPluginStart['search']>('Search');

export const [getUsageCollector, setUsageCollector] = createGetterSetter<UsageCollectionSetup>(
  'UsageCollection'
);

export const [getExpressions, setExpressions] = createGetterSetter<ExpressionsStart>('Expressions');

export const [getUiActions, setUiActions] = createGetterSetter<UiActionsStart>('UiActions');

export const [
  getSavedVisualizationsLoader,
  setSavedVisualizationsLoader,
] = createGetterSetter<SavedVisualizationsLoader>('SavedVisualisationsLoader');

export const [getAggs, setAggs] = createGetterSetter<DataPublicPluginStart['search']['aggs']>(
  'AggConfigs'
);

export const [getOverlays, setOverlays] = createGetterSetter<OverlayStart>('Overlays');

export const [getChrome, setChrome] = createGetterSetter<ChromeStart>('Chrome');

export const [getSavedSearchLoader, setSavedSearchLoader] = createGetterSetter<SavedObjectLoader>(
  'savedSearchLoader'
);
