/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { IndexPatternsContract } from '../index_patterns';
import { IndexPatternSpec } from '..';

const name = 'indexPatternLoad';
const type = 'index_pattern';

export interface IndexPatternExpressionType {
  type: typeof type;
  value: IndexPatternSpec;
}

type Input = null;
type Output = Promise<IndexPatternExpressionType>;

interface Arguments {
  id: string;
}

/** @internal */
export interface IndexPatternLoadStartDependencies {
  indexPatterns: IndexPatternsContract;
}

export type IndexPatternLoadExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof name,
  Input,
  Arguments,
  Output
>;

export const getIndexPatternLoadMeta = (): Omit<
  IndexPatternLoadExpressionFunctionDefinition,
  'fn'
> => ({
  name,
  type,
  inputTypes: ['null'],
  help: i18n.translate('data.functions.indexPatternLoad.help', {
    defaultMessage: 'Loads an index pattern',
  }),
  args: {
    id: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.functions.indexPatternLoad.id.help', {
        defaultMessage: 'index pattern id to load',
      }),
    },
  },
});
