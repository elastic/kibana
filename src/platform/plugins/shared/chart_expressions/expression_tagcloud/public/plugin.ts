/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ExpressionsStart, ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { createStartServicesGetter, StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { tagcloudRenderer } from './expression_renderers';
import { tagcloudFunction } from '../common/expression_functions';
import { setFormatService } from './format_service';

interface SetupDeps {
  expressions: ExpressionsSetup;
  charts: ChartsPluginSetup;
}

/** @internal  */
export interface ExpressionTagcloudRendererDependencies {
  getStartDeps: StartServicesGetter<StartDeps>;
}

interface StartDeps {
  expression: ExpressionsStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
  usageCollection?: UsageCollectionStart;
}

export type ExpressionTagcloudPluginSetup = void;
export type ExpressionTagcloudPluginStart = void;

export class ExpressionTagcloudPlugin
  implements
    Plugin<ExpressionTagcloudPluginSetup, ExpressionTagcloudPluginStart, SetupDeps, StartDeps>
{
  public setup(
    core: CoreSetup<StartDeps, ExpressionTagcloudPluginStart>,
    { expressions, charts }: SetupDeps
  ): ExpressionTagcloudPluginSetup {
    const getStartDeps = createStartServicesGetter<StartDeps, ExpressionTagcloudPluginStart>(
      core.getStartServices
    );

    expressions.registerFunction(tagcloudFunction);
    expressions.registerRenderer(tagcloudRenderer({ getStartDeps }));
  }

  public start(core: CoreStart, { fieldFormats }: StartDeps): ExpressionTagcloudPluginStart {
    setFormatService(fieldFormats);
  }

  public stop() {}
}
