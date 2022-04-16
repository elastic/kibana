/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { CoreSetup, DocLinksStart } from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';

export const [getUISettings, setUISettings] =
  createGetterSetter<CoreSetup['uiSettings']>('xy core.uiSettings');

export const [getDataActions, setDataActions] =
  createGetterSetter<DataPublicPluginStart['actions']>('xy data.actions');

export const [getFormatService, setFormatService] =
  createGetterSetter<DataPublicPluginStart['fieldFormats']>('xy data.fieldFormats');

export const [getThemeService, setThemeService] =
  createGetterSetter<ChartsPluginSetup['theme']>('xy charts.theme');

export const [getActiveCursor, setActiveCursor] =
  createGetterSetter<ChartsPluginStart['activeCursor']>('xy charts.activeCursor');

export const [getPalettesService, setPalettesService] =
  createGetterSetter<ChartsPluginSetup['palettes']>('xy charts.palette');

export const [getDocLinks, setDocLinks] = createGetterSetter<DocLinksStart>('DocLinks');

export const [getTrackUiMetric, setTrackUiMetric] =
  createGetterSetter<(metricType: UiCounterMetricType, eventName: string | string[]) => void>(
    'trackUiMetric'
  );
