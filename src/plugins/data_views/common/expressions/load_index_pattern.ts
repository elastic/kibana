/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { SavedObjectReference } from '@kbn/core/types';
import { DataViewsContract } from '../data_views';
import { DataViewSpec } from '..';

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
  help: i18n.translate('dataViews.functions.dataViewLoad.help', {
    defaultMessage: 'Loads a data view',
  }),
  args: {
    id: {
      types: ['string'],
      required: true,
      help: i18n.translate('dataViews.functions.dataViewLoad.id.help', {
        defaultMessage: 'data view id to load',
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
