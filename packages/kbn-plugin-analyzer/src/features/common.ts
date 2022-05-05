/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { either } from 'fp-ts';

export interface FeatureLocation {
  sourceFilePath: string;
  lineNumber: number;
}

export interface BaseFeature {
  location: FeatureLocation;
}

export interface GenericFeature extends BaseFeature {
  type: 'generic';
  description: string;
}

export const formatCommonFeatureProperties = (feature: BaseFeature) =>
  `Location: ${feature.location.sourceFilePath}:${feature.location.lineNumber}`;

export const formatEitherWithError = <Value>(
  eitherWithError: either.Either<Error, Value>,
  formatValue: (value: Value) => string
): string => {
  return either.fold((e: Error) => `Error: ${e.message}`, formatValue)(eitherWithError);
};

export const formatGenericFeature = (feature: GenericFeature): string => `## Generic feature
${formatCommonFeatureProperties(feature)}
description: ${feature.description}`;
