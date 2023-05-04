/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { LEGACY_TIME_AXIS } from '@kbn/charts-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { EventAnnotationPluginSetup } from '@kbn/event-annotation-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { ExpressionXyPluginSetup, ExpressionXyPluginStart, SetupDeps } from './types';
import {
  xyVisFunction,
  layeredXyVisFunction,
  extendedDataLayerFunction,
  dataDecorationConfigFunction,
  xAxisConfigFunction,
  yAxisConfigFunction,
  legendConfigFunction,
  axisExtentConfigFunction,
  referenceLineFunction,
  referenceLineLayerFunction,
  annotationLayerFunction,
  extendedAnnotationLayerFunction,
  referenceLineDecorationConfigFunction,
} from '../common/expression_functions';
import { GetStartDepsFn, getXyChartRenderer } from './expression_renderers';
import { eventAnnotationsResult } from '../common/expression_functions/event_annotations_result';

export interface XYPluginStartDependencies {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginStart;
  eventAnnotation: EventAnnotationPluginSetup;
  usageCollection?: UsageCollectionStart;
}

export function getTimeZone(uiSettings: IUiSettingsClient) {
  const configuredTimeZone = uiSettings.get('dateFormat:tz');
  if (configuredTimeZone === 'Browser') {
    return moment.tz.guess();
  }

  return configuredTimeZone;
}

export class ExpressionXyPlugin {
  public setup(
    core: CoreSetup<XYPluginStartDependencies>,
    { expressions, charts }: SetupDeps
  ): ExpressionXyPluginSetup {
    expressions.registerFunction(yAxisConfigFunction);
    expressions.registerFunction(dataDecorationConfigFunction);
    expressions.registerFunction(referenceLineDecorationConfigFunction);
    expressions.registerFunction(legendConfigFunction);
    expressions.registerFunction(extendedDataLayerFunction);
    expressions.registerFunction(axisExtentConfigFunction);
    expressions.registerFunction(xAxisConfigFunction);
    expressions.registerFunction(annotationLayerFunction);
    expressions.registerFunction(extendedAnnotationLayerFunction);
    expressions.registerFunction(eventAnnotationsResult);
    expressions.registerFunction(referenceLineFunction);
    expressions.registerFunction(referenceLineLayerFunction);
    expressions.registerFunction(xyVisFunction);
    expressions.registerFunction(layeredXyVisFunction);

    const getStartDeps: GetStartDepsFn = async () => {
      const [coreStart, deps] = await core.getStartServices();
      const {
        data,
        usageCollection,
        fieldFormats,
        eventAnnotation,
        charts: { activeCursor, theme, palettes },
      } = deps;

      const paletteService = await palettes.getPalettes();

      const { theme: kibanaTheme } = coreStart;
      const eventAnnotationService = await eventAnnotation.getService();
      const useLegacyTimeAxis = core.uiSettings.get(LEGACY_TIME_AXIS);

      return {
        data,
        formatFactory: fieldFormats.deserialize,
        kibanaTheme,
        theme,
        usageCollection,
        activeCursor,
        paletteService,
        useLegacyTimeAxis,
        eventAnnotationService,
        timeZone: getTimeZone(core.uiSettings),
        timeFormat: core.uiSettings.get('dateFormat'),
      };
    };

    expressions.registerRenderer(getXyChartRenderer({ getStartDeps }));
  }

  public start(core: CoreStart): ExpressionXyPluginStart {}

  public stop() {}
}
