/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { DataViewsContract } from '../index_patterns';
import { DataViewSpec } from '..';
import { SavedObjectReference } from '../../../../../core/types';

const name = 'indexPatternLoad';
const type = 'index_pattern';

export interface IndexPatternExpressionType {
  type: typeof type;
  value: DataViewSpec;
}

type Input = null;
type Output = Promise<IndexPatternExpressionType>;

interface Arguments {
  id: string;
}

/** @internal */
export interface IndexPatternLoadStartDependencies {
  indexPatterns: DataViewsContract;
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
  extract(state) {
    const refName = 'indexPatternLoad.id';
    const references: SavedObjectReference[] = [
      {
        name: refName,
        type: 'search',
        id: state.id[0] as string,
      },
    ];
    return {
      state: {
        ...state,
        id: [refName],
      },
      references,
    };
  },

  inject(state, references) {
    const reference = references.find((ref) => ref.name === 'indexPatternLoad.id');
    if (reference) {
      state.id[0] = reference.id;
    }
    return state;
  },
});
