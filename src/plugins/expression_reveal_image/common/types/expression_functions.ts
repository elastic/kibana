/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ExpressionFunctionDefinition, ExpressionValueRender } from '@kbn/expressions-plugin';

export enum Origin {
  TOP = 'top',
  LEFT = 'left',
  BOTTOM = 'bottom',
  RIGHT = 'right',
}

interface Arguments {
  image: string | null;
  emptyImage: string | null;
  origin: Origin;
}

export interface Output {
  image: string;
  emptyImage: string;
  origin: Origin;
  percent: number;
}

export type ExpressionRevealImageFunction = () => ExpressionFunctionDefinition<
  'revealImage',
  number,
  Arguments,
  Promise<ExpressionValueRender<Output>>
>;

export enum Position {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
}
