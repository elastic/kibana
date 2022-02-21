/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ApplicationStart,
  Capabilities,
  ChromeStart,
  HttpStart,
  IUiSettingsClient,
  OverlayStart,
  SavedObjectsStart,
  DocLinksStart,
  ThemeServiceStart,
  ExecutionContextSetup,
} from '../../../core/public';
import type { TypesStart } from './vis_types';
import { createGetterSetter } from '../../../plugins/kibana_utils/public';
import { DataPublicPluginStart, TimefilterContract } from '../../../plugins/data/public';
import { UsageCollectionSetup } from '../../../plugins/usage_collection/public';
import { ExpressionsStart } from '../../../plugins/expressions/public';
import { UiActionsStart } from '../../../plugins/ui_actions/public';
import { EmbeddableStart } from '../../embeddable/public';
import type { SpacesPluginStart } from '../../../../x-pack/plugins/spaces/public';

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [getTheme, setTheme] = createGetterSetter<ThemeServiceStart>('Theme');

export const [getCapabilities, setCapabilities] = createGetterSetter<Capabilities>('Capabilities');

export const [getHttp, setHttp] = createGetterSetter<HttpStart>('Http');

export const [getApplication, setApplication] = createGetterSetter<ApplicationStart>('Application');

export const [getEmbeddable, setEmbeddable] = createGetterSetter<EmbeddableStart>('Embeddable');

export const [getSavedObjects, setSavedObjects] =
  createGetterSetter<SavedObjectsStart>('SavedObjects');

export const [getTypes, setTypes] = createGetterSetter<TypesStart>('Types');

export const [getDocLinks, setDocLinks] = createGetterSetter<DocLinksStart>('DocLinks');

export const [getTimeFilter, setTimeFilter] = createGetterSetter<TimefilterContract>('TimeFilter');

export const [getSearch, setSearch] = createGetterSetter<DataPublicPluginStart['search']>('Search');

export const [getUsageCollector, setUsageCollector] = createGetterSetter<UsageCollectionSetup>(
  'UsageCollection',
  false
);

export const [getExpressions, setExpressions] = createGetterSetter<ExpressionsStart>('Expressions');

export const [getUiActions, setUiActions] = createGetterSetter<UiActionsStart>('UiActions');

export const [getAggs, setAggs] =
  createGetterSetter<DataPublicPluginStart['search']['aggs']>('AggConfigs');

export const [getOverlays, setOverlays] = createGetterSetter<OverlayStart>('Overlays');

export const [getChrome, setChrome] = createGetterSetter<ChromeStart>('Chrome');

export const [getExecutionContext, setExecutionContext] =
  createGetterSetter<ExecutionContextSetup>('ExecutionContext');

export const [getSpaces, setSpaces] = createGetterSetter<SpacesPluginStart>('Spaces', false);
