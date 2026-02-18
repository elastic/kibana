/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThreeWayDiff, ThreeWayDiffAlgorithm } from './three_way_diff';

export type ThreeWayFieldsDiff<TObject> = Required<{
  [Field in keyof TObject]: ThreeWayDiff<TObject[Field]>;
}>;

export type ThreeWayFieldsDiffAlgorithmsFor<TObject> = Required<{
  [Field in keyof TObject]: ThreeWayDiffAlgorithm<TObject[Field]>;
}>;
