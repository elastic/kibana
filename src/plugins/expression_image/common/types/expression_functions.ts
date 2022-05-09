/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin';

export enum ImageMode {
  CONTAIN = 'contain',
  COVER = 'cover',
  STRETCH = 'stretch',
}

interface Arguments {
  dataurl: string | null;
  mode: ImageMode | null;
}

export interface Return {
  type: 'image';
  mode: string;
  dataurl: string;
}

export type ExpressionImageFunction = () => ExpressionFunctionDefinition<
  'image',
  null,
  Arguments,
  Promise<Return>
>;
