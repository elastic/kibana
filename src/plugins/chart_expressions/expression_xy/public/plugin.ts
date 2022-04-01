/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { LEGACY_TIME_AXIS } from '../../../charts/common';
import { DataPublicPluginStart } from '../../../data/public';
import { FieldFormatsStart } from '../../../field_formats/public';
import { ChartsPluginStart } from '../../../charts/public';
import { CoreSetup, CoreStart, IUiSettingsClient } from '../../../../core/public';
import { ExpressionXyPluginSetup, ExpressionXyPluginStart, SetupDeps } from './types';
import {
  xyVisFunction,
  layeredXyVisFunction,
  dataLayerFunction,
  extendedDataLayerFunction,
  yAxisConfigFunction,
  legendConfigFunction,
  gridlinesConfigFunction,
  axisExtentConfigFunction,
  tickLabelsConfigFunction,
  referenceLineLayerFunction,
  extendedReferenceLineLayerFunction,
  annotationLayerFunction,
  extendedAnnotationLayerFunction,
  labelsOrientationConfigFunction,
  axisTitlesVisibilityConfigFunction,
} from '../common';
import { GetStartDepsFn, getXyChartRenderer } from './expression_renderers';
import { EventAnnotationPluginSetup } from '../../../event_annotation/public';

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
    expressions.registerFunction(legendConfigFunction);
    expressions.registerFunction(gridlinesConfigFunction);
    expressions.registerFunction(dataLayerFunction);
    expressions.registerFunction(extendedDataLayerFunction);
    expressions.registerFunction(axisExtentConfigFunction);
    expressions.registerFunction(tickLabelsConfigFunction);
    expressions.registerFunction(annotationLayerFunction);
    expressions.registerFunction(extendedAnnotationLayerFunction);
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
