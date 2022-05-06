/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { either, function as fn } from 'fp-ts';
import { Type, TypeFormatFlags } from 'ts-morph';
import { BaseFeature, formatCommonFeatureProperties, formatEitherWithError } from './common';

export interface HttpRouteFeature extends BaseFeature {
  type: 'http-route';
  path: either.Either<Error, string>;
  requestParamsType: either.Either<Error, Type>;
  requestQueryType: either.Either<Error, Type>;
  requestBodyType: either.Either<Error, Type>;
}

export const formatHttpRouteFeature = (feature: HttpRouteFeature): string => `## HTTP route
${formatCommonFeatureProperties(feature)}
Path: ${formatEitherWithError(feature.path, (path) => path)}
RequestParams: ${formatValidationType(feature.requestParamsType)}
RequestQuery: ${formatValidationType(feature.requestQueryType)}
RequestBody: ${formatValidationType(feature.requestBodyType)}
`;

const formatValidationType = (validationType: either.Either<Error, Type>) =>
  fn.pipe(
    validationType,
    either.fold(
      (error: Error) => 'Missing',
      (value) =>
        value.getText(
          undefined,
          // eslint-disable-next-line no-bitwise
          TypeFormatFlags.NoTruncation | TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
        )
    )
  );
