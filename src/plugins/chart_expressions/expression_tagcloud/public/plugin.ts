/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, ThemeServiceStart } from '../../../../core/public';
import { ExpressionsStart, ExpressionsSetup } from '../../../expressions/public';
import { ChartsPluginSetup } from '../../../charts/public';
import { tagcloudRenderer } from './expression_renderers';
import { tagcloudFunction } from '../common/expression_functions';
import { FieldFormatsStart } from '../../../field_formats/public';
import { setFormatService } from './format_service';

interface SetupDeps {
  expressions: ExpressionsSetup;
  charts: ChartsPluginSetup;
}

/** @internal  */
export interface ExpressioTagcloudRendererDependencies {
  palettes: ChartsPluginSetup['palettes'];
  theme: ThemeServiceStart;
}

interface StartDeps {
  expression: ExpressionsStart;
  fieldFormats: FieldFormatsStart;
}

export type ExpressionTagcloudPluginSetup = void;
export type ExpressionTagcloudPluginStart = void;

export class ExpressionTagcloudPlugin
  implements
    Plugin<ExpressionTagcloudPluginSetup, ExpressionTagcloudPluginStart, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup, { expressions, charts }: SetupDeps): ExpressionTagcloudPluginSetup {
    const rendererDependencies: ExpressioTagcloudRendererDependencies = {
      palettes: charts.palettes,
      theme: core.theme,
    };
    expressions.registerFunction(tagcloudFunction);
    expressions.registerRenderer(tagcloudRenderer(rendererDependencies));
  }

  public start(core: CoreStart, { fieldFormats }: StartDeps): ExpressionTagcloudPluginStart {
    setFormatService(fieldFormats);
  }

  public stop() {}
}
