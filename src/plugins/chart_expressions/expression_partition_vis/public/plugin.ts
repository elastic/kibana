/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { CoreSetup, CoreStart, ThemeServiceStart } from '@kbn/core/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  partitionLabelsFunction,
  pieVisFunction,
  treemapVisFunction,
  mosaicVisFunction,
  waffleVisFunction,
} from '../common';
import { getPartitionVisRenderer } from './expression_renderers';
import {
  ExpressionPartitionVisPluginSetup,
  ExpressionPartitionVisPluginStart,
  SetupDeps,
  StartDeps,
} from './types';

/** @internal */
export interface VisTypePieDependencies {
  theme: ChartsPluginSetup['theme'];
  palettes: ChartsPluginSetup['palettes'];
  getStartDeps: () => Promise<{
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    kibanaTheme: ThemeServiceStart;
  }>;
}

export interface VisTypePiePluginStartDependencies {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
}

export class ExpressionPartitionVisPlugin {
  public setup(
    core: CoreSetup<VisTypePiePluginStartDependencies>,
    { expressions, charts }: SetupDeps
  ): ExpressionPartitionVisPluginSetup {
    expressions.registerFunction(partitionLabelsFunction);
    expressions.registerFunction(pieVisFunction);
    expressions.registerFunction(treemapVisFunction);
    expressions.registerFunction(mosaicVisFunction);
    expressions.registerFunction(waffleVisFunction);

    const getStartDeps = async () => {
      const [coreStart, deps] = await core.getStartServices();
      const { data, fieldFormats } = deps;
      const { theme: kibanaTheme } = coreStart;
      return { data, fieldFormats, kibanaTheme };
    };

    expressions.registerRenderer(
      getPartitionVisRenderer({ theme: charts.theme, palettes: charts.palettes, getStartDeps })
    );
  }

  public start(core: CoreStart, deps: StartDeps): ExpressionPartitionVisPluginStart {}

  public stop() {}
}
