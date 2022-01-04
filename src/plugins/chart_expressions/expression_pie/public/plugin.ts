/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, DocLinksStart, ThemeServiceStart } from '../../../../core/public';
import { ChartsPluginSetup } from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import { pieLabelsFunction, pieVisFunction } from '../common';
import { getPieVisRenderer } from './expression_renderers';
import { ExpressionPiePluginSetup, ExpressionPiePluginStart, SetupDeps, StartDeps } from './types';

/** @internal */
export interface VisTypePieDependencies {
  theme: ChartsPluginSetup['theme'];
  palettes: ChartsPluginSetup['palettes'];
  getStartDeps: () => Promise<{
    data: DataPublicPluginStart;
    docLinks: DocLinksStart;
    kibanaTheme: ThemeServiceStart;
  }>;
}

export interface VisTypePiePluginStartDependencies {
  data: DataPublicPluginStart;
}

export class ExpressionPiePlugin {
  public setup(
    core: CoreSetup<VisTypePiePluginStartDependencies>,
    { expressions, charts }: SetupDeps
  ): ExpressionPiePluginSetup {
    expressions.registerFunction(pieLabelsFunction);
    expressions.registerFunction(pieVisFunction);

    const getStartDeps = async () => {
      const [coreStart, deps] = await core.getStartServices();
      return {
        data: deps.data,
        docLinks: coreStart.docLinks,
        kibanaTheme: coreStart.theme,
      };
    };

    expressions.registerRenderer(
      getPieVisRenderer({ theme: charts.theme, palettes: charts.palettes, getStartDeps })
    );
  }

  public start(core: CoreStart, deps: StartDeps): ExpressionPiePluginStart {}

  public stop() {}
}
