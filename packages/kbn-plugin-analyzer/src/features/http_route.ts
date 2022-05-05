/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { either } from 'fp-ts';
import { BaseFeature, formatCommonFeatureProperties, formatEitherWithError } from './common';

export interface HttpRouteFeature extends BaseFeature {
  type: 'http-route';
  path: either.Either<Error, string>;
}

export const formatHttpRouteFeature = (feature: HttpRouteFeature): string => `## HTTP route
${formatCommonFeatureProperties(feature)}
path: ${formatEitherWithError(feature.path, (path) => path)}`;
