/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { CoreSetup, DocLinksStart } from '../../../core/public';
import { createGetterSetter } from '../../kibana_utils/public';
import { DataPublicPluginStart } from '../../data/public';
import { ChartsPluginSetup } from '../../charts/public';

export const [getUISettings, setUISettings] = createGetterSetter<CoreSetup['uiSettings']>(
  'xy core.uiSettings'
);

export const [getDataActions, setDataActions] = createGetterSetter<
  DataPublicPluginStart['actions']
>('xy data.actions');

export const [getFormatService, setFormatService] = createGetterSetter<
  DataPublicPluginStart['fieldFormats']
>('xy data.fieldFormats');

export const [getTimefilter, setTimefilter] = createGetterSetter<
  DataPublicPluginStart['query']['timefilter']['timefilter']
>('xy data.query.timefilter.timefilter');

export const [getThemeService, setThemeService] = createGetterSetter<ChartsPluginSetup['theme']>(
  'xy charts.theme'
);

export const [getPalettesService, setPalettesService] = createGetterSetter<
  ChartsPluginSetup['palettes']
>('xy charts.palette');

export const [getDocLinks, setDocLinks] = createGetterSetter<DocLinksStart>('DocLinks');

export const [getTrackUiMetric, setTrackUiMetric] = createGetterSetter<
  (metricType: UiCounterMetricType, eventName: string | string[]) => void
>('trackUiMetric');
