/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexPatternsContract, ISearchStart } from 'src/plugins/data/public';
import type { ChartsPluginStart } from 'src/plugins/charts/public';
import { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { createGetterSetter } from '../../../../kibana_utils/public';

export const [getIndexPatterns, setIndexPatterns] =
  createGetterSetter<IndexPatternsContract>('IndexPatterns');

export const [getDataSearch, setDataSearch] = createGetterSetter<ISearchStart>('Search');

export const [getCharts, setCharts] = createGetterSetter<ChartsPluginStart>('Charts');

export const [getFieldFormats, setFieldFormats] =
  createGetterSetter<FieldFormatsStart>('FieldFormats');
