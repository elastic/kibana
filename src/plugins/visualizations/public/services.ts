/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ApplicationStart } from '../../../core/public/application/types';
import type { ChromeStart } from '../../../core/public/chrome/types';
import type { DocLinksStart } from '../../../core/public/doc_links/doc_links_service';
import type { HttpStart } from '../../../core/public/http/types';
import type { OverlayStart } from '../../../core/public/overlays/overlay_service';
import type { SavedObjectsStart } from '../../../core/public/saved_objects/saved_objects_service';
import type { IUiSettingsClient } from '../../../core/public/ui_settings/types';
import type { Capabilities } from '../../../core/types/capabilities';
import type { TimefilterContract } from '../../data/public/query/timefilter/timefilter';
import type { DataPublicPluginStart } from '../../data/public/types';
import type { EmbeddableStart } from '../../embeddable/public/plugin';
import type { ExpressionsStart } from '../../expressions/public/plugin';
import { createGetterSetter } from '../../kibana_utils/common/create_getter_setter';
import { SavedObjectLoader } from '../../saved_objects/public/saved_object/saved_object_loader';
import type { UiActionsStart } from '../../ui_actions/public/plugin';
import type { UsageCollectionSetup } from '../../usage_collection/public/plugin';
import type { SavedVisualizationsLoader } from './saved_visualizations/saved_visualizations';
import type { TypesStart } from './vis_types/types_service';

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
