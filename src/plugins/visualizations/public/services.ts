/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type {
  ApplicationStart,
  Capabilities,
  ChromeStart,
  DocLinksStart,
  HttpStart,
  IUiSettingsClient,
  OverlayStart,
  SavedObjectsStart,
  ThemeServiceStart,
  ExecutionContextSetup,
  AnalyticsServiceStart,
  I18nStart,
} from '@kbn/core/public';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { TypesStart } from './vis_types';

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [getAnalytics, setAnalytics] = createGetterSetter<AnalyticsServiceStart>('Analytics');
export const [getI18n, setI18n] = createGetterSetter<I18nStart>('I18n');
export const [getTheme, setTheme] = createGetterSetter<ThemeServiceStart>('Theme');

export const [getCapabilities, setCapabilities] = createGetterSetter<Capabilities>('Capabilities');

export const [getHttp, setHttp] = createGetterSetter<HttpStart>('Http');

export const [getFieldsFormats, setFieldFormats] =
  createGetterSetter<FieldFormatsStart>('Field Formats');

export const [getApplication, setApplication] = createGetterSetter<ApplicationStart>('Application');

export const [getEmbeddable, setEmbeddable] = createGetterSetter<EmbeddableStart>('Embeddable');

export const [getSavedObjects, setSavedObjects] =
  createGetterSetter<SavedObjectsStart>('SavedObjects');

export const [getTypes, setTypes] = createGetterSetter<TypesStart>('Types');

export const [getDocLinks, setDocLinks] = createGetterSetter<DocLinksStart>('DocLinks');

export const [getTimeFilter, setTimeFilter] = createGetterSetter<TimefilterContract>('TimeFilter');

export const [getSearch, setSearch] = createGetterSetter<DataPublicPluginStart['search']>('Search');

export const [getExpressions, setExpressions] = createGetterSetter<ExpressionsStart>('Expressions');

export const [getUiActions, setUiActions] = createGetterSetter<UiActionsStart>('UiActions');

export const [getAggs, setAggs] =
  createGetterSetter<DataPublicPluginStart['search']['aggs']>('AggConfigs');

export const [getOverlays, setOverlays] = createGetterSetter<OverlayStart>('Overlays');

export const [getChrome, setChrome] = createGetterSetter<ChromeStart>('Chrome');

export const [getExecutionContext, setExecutionContext] =
  createGetterSetter<ExecutionContextSetup>('ExecutionContext');

export const [getSpaces, setSpaces] = createGetterSetter<SpacesPluginStart>('Spaces', false);

export const [getSavedObjectTagging, setSavedObjectTagging] =
  createGetterSetter<SavedObjectTaggingOssPluginStart>('SavedObjectTagging', false);

export const [getUsageCollection, setUsageCollection] =
  createGetterSetter<UsageCollectionStart>('UsageCollection');

export const [getSavedObjectsManagement, setSavedObjectsManagement] =
  createGetterSetter<SavedObjectsManagementPluginStart>('SavedObjectsManagement');

export const [getContentManagement, setContentManagement] =
  createGetterSetter<ContentManagementPublicStart>('SavedObjectsManagement');

export const [getSavedSearch, setSavedSearch] =
  createGetterSetter<SavedSearchPublicPluginStart>('SavedSearch');

export const [getDataViews, setDataViews] =
  createGetterSetter<DataViewsPublicPluginStart>('DataViews');

export const [getInspector, setInspector] = createGetterSetter<InspectorStart>('Inspector');
