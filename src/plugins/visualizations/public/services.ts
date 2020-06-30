/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  ApplicationStart,
  Capabilities,
  ChromeStart,
  HttpStart,
  I18nStart,
  IUiSettingsClient,
  OverlayStart,
  SavedObjectsStart,
} from '../../../core/public';
import { TypesStart } from './vis_types';
import { createGetterSetter } from '../../../plugins/kibana_utils/public';
import {
  DataPublicPluginStart,
  FilterManager,
  IndexPatternsContract,
  TimefilterContract,
} from '../../../plugins/data/public';
import { UsageCollectionSetup } from '../../../plugins/usage_collection/public';
import { ExpressionsStart } from '../../../plugins/expressions/public';
import { UiActionsStart } from '../../../plugins/ui_actions/public';
import { SavedVisualizationsLoader } from './saved_visualizations';
import { SavedObjectLoader } from '../../saved_objects/public';
import { EmbeddableStart } from '../../embeddable/public';

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [getCapabilities, setCapabilities] = createGetterSetter<Capabilities>('Capabilities');

export const [getHttp, setHttp] = createGetterSetter<HttpStart>('Http');

export const [getApplication, setApplication] = createGetterSetter<ApplicationStart>('Application');

export const [getEmbeddable, setEmbeddable] = createGetterSetter<EmbeddableStart>('Embeddable');

export const [getSavedObjects, setSavedObjects] = createGetterSetter<SavedObjectsStart>(
  'SavedObjects'
);

export const [getTypes, setTypes] = createGetterSetter<TypesStart>('Types');

export const [getI18n, setI18n] = createGetterSetter<I18nStart>('I18n');

export const [getFilterManager, setFilterManager] = createGetterSetter<FilterManager>(
  'FilterManager'
);

export const [getTimeFilter, setTimeFilter] = createGetterSetter<TimefilterContract>('TimeFilter');

export const [getIndexPatterns, setIndexPatterns] = createGetterSetter<IndexPatternsContract>(
  'IndexPatterns'
);

export const [getSearch, setSearch] = createGetterSetter<DataPublicPluginStart['search']>('Search');

export const [getUsageCollector, setUsageCollector] = createGetterSetter<UsageCollectionSetup>(
  'UsageCollection'
);

export const [getExpressions, setExpressions] = createGetterSetter<ExpressionsStart>('Expressions');

export const [getUiActions, setUiActions] = createGetterSetter<UiActionsStart>('UiActions');

export const [getSavedVisualizationsLoader, setSavedVisualizationsLoader] = createGetterSetter<
  SavedVisualizationsLoader
>('SavedVisualisationsLoader');

export const [getAggs, setAggs] = createGetterSetter<DataPublicPluginStart['search']['aggs']>(
  'AggConfigs'
);

export const [getOverlays, setOverlays] = createGetterSetter<OverlayStart>('Overlays');

export const [getChrome, setChrome] = createGetterSetter<ChromeStart>('Chrome');

export const [getSavedSearchLoader, setSavedSearchLoader] = createGetterSetter<SavedObjectLoader>(
  'savedSearchLoader'
);
