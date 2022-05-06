/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { array, either, function as fn, option } from 'fp-ts';
import { CallExpression, Directory, Node, SyntaxKind, ts } from 'ts-morph';
import { HttpRouteFeature } from '../features';
import {
  debug,
  getFeatureLocation,
  getLiteralValue,
  getPropertyInitializer,
  getScopeDirectory,
  wrapError,
} from './common_utilities';
import { AnalysisResult, Analyzer } from './types';

export const infraPluginHttpRouteAnalyzer: Analyzer = {
  name: 'InfraPluginHttpRouteAnalyzer',
  async apply(pluginProject) {
    return fn.pipe(
      getScopeDirectory(pluginProject, 'server'),
      either.chain(getRouteRegistrationFunction),
      either.map((routeRegistrationFunction) =>
        fn.pipe(
          routeRegistrationFunction.findReferencesAsNodes(),
          array.filterMap((ref) =>
            option.fromNullable(ref.getFirstAncestorByKind(SyntaxKind.CallExpression))
          ),
          array.map(
            (callExpression): HttpRouteFeature => ({
              type: 'http-route',
              location: getFeatureLocation(callExpression),
              path: getPathValue(callExpression),
              requestParamsType: getRequestType('params')(callExpression),
              requestQueryType: getRequestType('query')(callExpression),
              requestBodyType: getRequestType('body')(callExpression),
            })
          )
        )
      ),
      either.fold(
        (error): AnalysisResult => ({
          features: [],
          errors: [error],
        }),
        (features): AnalysisResult => ({
          features,
          errors: [],
        })
      )
    );
  },
};

const routeRegistrationFunctionFile = 'lib/adapters/framework/kibana_framework_adapter.ts';

const getRouteRegistrationFunction = (serverDirectory: Directory) =>
  either.tryCatch(
    () =>
      serverDirectory
        .getSourceFileOrThrow(routeRegistrationFunctionFile)
        .getClassOrThrow('KibanaFramework')
        .getInstanceMethodOrThrow('registerRoute'),
    wrapError
  );

const getRouteConfigObject = (callSite: CallExpression<ts.CallExpression>) =>
  fn.pipe(
    callSite.getArguments(),
    array.head,
    either.fromOption(
      () => new Error('Failed to find the route config literal: too few function arguments')
    ),
    either.filterOrElse(
      Node.isObjectLiteralExpression,
      () => new Error('Failed to find the route config literal: not a config object')
    )
  );

const getPathValue = (callSite: CallExpression<ts.CallExpression>) =>
  fn.pipe(
    getRouteConfigObject(callSite),
    either.chain(getPropertyInitializer('path')),
    either.chain(getLiteralValue),
    either.map(String)
  );

const getRequestType =
  (key: 'params' | 'body' | 'query') => (callSite: CallExpression<ts.CallExpression>) =>
    fn.pipe(
      getRouteConfigObject(callSite),
      either.chain(getPropertyInitializer('validate')),
      either.filterOrElse(
        Node.isObjectLiteralExpression,
        () => new Error('Failed to find the validate config literal: not an object')
      ),
      either.chain(getPropertyInitializer(key)),
      either.chain((paramsInitializer) => {
        const paramsInitializerType = paramsInitializer.getType();
        return either.fromNullable(
          new Error(
            `Failed to find the "${key}" validator type argument: no type arguments in ${paramsInitializer
              .getType()
              .getText()}`
          )
        )(
          paramsInitializerType.getTypeArguments()[0] ??
            paramsInitializerType.getAliasTypeArguments()[0]
        );
      })
    );
