/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Serializable } from '@kbn/utility-types';
import { has } from 'lodash';
import type { FieldFilter, Filter } from './types';

export type MatchAllFilter = Filter & {
  match_all: Serializable;
};

/**
 * @param filter
 * @returns `true` if a filter is an `MatchAllFilter`
 *
 * @public
 */
export const isMatchAllFilter = (filter: FieldFilter): filter is MatchAllFilter =>
  has(filter, 'match_all');
