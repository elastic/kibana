/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ExpressionFunctionDefinition, ExpressionValueRender } from '@kbn/expressions-plugin';

interface Arguments {
  image: string | null;
  size: number;
  max: number | null;
  emptyImage: string | null;
}

export interface Return {
  count: number;
  image: string;
  size: number;
  max: number;
  emptyImage: string | null;
}

export type ExpressionRepeatImageFunction = () => ExpressionFunctionDefinition<
  'repeatImage',
  number,
  Arguments,
  Promise<ExpressionValueRender<Arguments>>
>;
