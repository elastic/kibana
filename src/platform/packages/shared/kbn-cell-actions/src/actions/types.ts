/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { SerializableArray } from '@kbn/utility-types/src/serializable';
import type { CellAction } from '../types';

export type DefaultActionsSupportedValue = string[] | number[] | boolean[];

export type NonNullableSerializable =
  | string
  | number
  | boolean
  | SerializableArray
  | SerializableRecord;

/**
 * Cell action factory template with optional `id`.
 * The id override is required when using the action factory so it
 * can be omitted in the original action creator
 */
export type CellActionTemplate<C extends CellAction = CellAction> = Omit<C, 'id'>;
/**
 * Action factory extend parameter type,
 */
export type CellActionExtend<C extends CellAction = CellAction> = Partial<C> & { id: string };
export interface CellActionFactory<C extends CellAction = CellAction> {
  <A extends C = C>(extend: CellActionExtend<A>): A;
  combine: <A extends C = C>(
    partialActionTemplate: Partial<CellActionTemplate<A>>
  ) => CellActionFactory<A>;
}
