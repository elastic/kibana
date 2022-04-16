/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISearchStart } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';

export const [getIndexPatterns, setIndexPatterns] =
  createGetterSetter<DataViewsContract>('dataViews');

export const [getDataSearch, setDataSearch] = createGetterSetter<ISearchStart>('Search');

export const [getCharts, setCharts] = createGetterSetter<ChartsPluginStart>('Charts');

export const [getFieldFormats, setFieldFormats] =
  createGetterSetter<FieldFormatsStart>('FieldFormats');
