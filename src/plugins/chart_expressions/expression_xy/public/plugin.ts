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
import { ExpressionXyPluginSetup, ExpressionXyPluginStart, SetupDeps } from './types';
import {
  xyVisFunction,
  layeredXyVisFunction,
  dataLayerFunction,
  extendedDataLayerFunction,
  yAxisConfigFunction,
  extendedYAxisConfigFunction,
  legendConfigFunction,
  gridlinesConfigFunction,
  axisExtentConfigFunction,
  tickLabelsConfigFunction,
  referenceLineLayerFunction,
  extendedReferenceLineLayerFunction,
  annotationLayerFunction,
  labelsOrientationConfigFunction,
  axisTitlesVisibilityConfigFunction,
} from '../common/expression_functions';
import { GetStartDepsFn, getXyChartRenderer } from './expression_renderers';

export interface XYPluginStartDependencies {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginStart;
  eventAnnotation: EventAnnotationPluginSetup;
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
    expressions.registerFunction(extendedYAxisConfigFunction);
    expressions.registerFunction(legendConfigFunction);
    expressions.registerFunction(gridlinesConfigFunction);
    expressions.registerFunction(dataLayerFunction);
    expressions.registerFunction(extendedDataLayerFunction);
    expressions.registerFunction(axisExtentConfigFunction);
    expressions.registerFunction(tickLabelsConfigFunction);
    expressions.registerFunction(annotationLayerFunction);
    expressions.registerFunction(labelsOrientationConfigFunction);
    expressions.registerFunction(referenceLineLayerFunction);
    expressions.registerFunction(extendedReferenceLineLayerFunction);
    expressions.registerFunction(axisTitlesVisibilityConfigFunction);
    expressions.registerFunction(xyVisFunction);
    expressions.registerFunction(layeredXyVisFunction);

    const getStartDeps: GetStartDepsFn = async () => {
      const [coreStart, deps] = await core.getStartServices();
      const {
        data,
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
        activeCursor,
        paletteService,
        useLegacyTimeAxis,
        eventAnnotationService,
        timeZone: getTimeZone(core.uiSettings),
      };
    };

    expressions.registerRenderer(getXyChartRenderer({ getStartDeps }));
  }

  public start(core: CoreStart): ExpressionXyPluginStart {}

  public stop() {}
}
