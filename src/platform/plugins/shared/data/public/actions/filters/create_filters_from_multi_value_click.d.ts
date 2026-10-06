/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { Truthy } from 'lodash';
import type { MultiValueClickContext } from '../multi_value_click_action';
export type MultiValueClickDataContext = MultiValueClickContext['data'];
export declare const truthy: <T>(value: T) => value is Truthy<T>;
/** @public */
export declare const createFiltersFromMultiValueClickAction: ({
  data,
  negate,
}: MultiValueClickDataContext) => Promise<undefined | Filter[]>;
