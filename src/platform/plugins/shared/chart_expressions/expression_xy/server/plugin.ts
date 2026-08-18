/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import {
  xyVisFunction,
  legendConfigFunction,
  dataDecorationConfigFunction,
  xAxisConfigFunction,
  yAxisConfigFunction,
  referenceLineDecorationConfigFunction,
  axisExtentConfigFunction,
  annotationLayerFunction,
  referenceLineFunction,
  extendedDataLayerFunction,
  referenceLineLayerFunction,
  layeredXyVisFunction,
  extendedAnnotationLayerFunction,
} from '../common/expression_functions';
import { eventAnnotationsResult } from '../common/expression_functions/event_annotations_result';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ExpressionXyPlugin extends Service {
  static readonly inject = ['expressions.setup'];
  static readonly provide = 'expressionXY';

  constructor(ctx: Context) {
    super(ctx, 'expressionXY');
    const expressions = (ctx.get('expressions.setup') as any).contract;
    expressions.registerFunction(yAxisConfigFunction);
        expressions.registerFunction(dataDecorationConfigFunction);
        expressions.registerFunction(xAxisConfigFunction);
        expressions.registerFunction(referenceLineDecorationConfigFunction);
        expressions.registerFunction(legendConfigFunction);
        expressions.registerFunction(extendedDataLayerFunction);
        expressions.registerFunction(axisExtentConfigFunction);
        expressions.registerFunction(annotationLayerFunction);
        expressions.registerFunction(extendedAnnotationLayerFunction);
        expressions.registerFunction(eventAnnotationsResult);
        expressions.registerFunction(referenceLineFunction);
        expressions.registerFunction(referenceLineLayerFunction);
        expressions.registerFunction(xyVisFunction);
        expressions.registerFunction(layeredXyVisFunction);
  }
}
