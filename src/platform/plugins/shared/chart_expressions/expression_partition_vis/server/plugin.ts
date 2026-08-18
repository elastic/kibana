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
  partitionLabelsFunction,
  pieVisFunction,
  treemapVisFunction,
  mosaicVisFunction,
  waffleVisFunction,
} from '../common';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ExpressionPartitionVisPlugin extends Service {
  static readonly inject = ['expressions.setup'];
  static readonly provide = 'expressionPartitionVis';

  constructor(ctx: Context) {
    super(ctx, 'expressionPartitionVis');
    const expressions = (ctx.get('expressions.setup') as any).contract;
    expressions.registerFunction(partitionLabelsFunction);
        expressions.registerFunction(pieVisFunction);
        expressions.registerFunction(treemapVisFunction);
        expressions.registerFunction(mosaicVisFunction);
        expressions.registerFunction(waffleVisFunction);
  }
}
