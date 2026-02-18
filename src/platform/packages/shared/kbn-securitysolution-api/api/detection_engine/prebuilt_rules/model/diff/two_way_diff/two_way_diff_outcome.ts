/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Used for the structures that contain the two-way diff algorithms
 *
 * These types will throw an error when a field is missing from the comparator groups,
 * alerting us to a field that won't be compared during the two-way diff calculation.
 */
export type TwoWayFieldsDiffAlgorithmsFor<TObject> = Required<{
  [Field in keyof TObject]: TwoWayDiffAlgorithm<TObject[Field]>;
}>;

/**
 * Type for the two way diff algorithm comparison itself
 *
 * All of these algorithms take in two field values and return if the values are equal
 * to one another.
 */
export type TwoWayDiffAlgorithm<TValue> = (a_value: TValue, b_value: TValue) => boolean;
