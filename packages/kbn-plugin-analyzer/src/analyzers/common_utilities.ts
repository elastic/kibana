/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { array, either, function as fn } from 'fp-ts';
import {
  Node,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  ShorthandPropertyAssignment,
} from 'ts-morph';
import { FeatureLocation } from '../features';

export const getScopeDirectory = (
  pluginProject: Project,
  apiScope: 'common' | 'public' | 'server'
) =>
  fn.pipe(
    pluginProject.getRootDirectories(),
    array.findFirst((rootDirectory) => rootDirectory.getBaseName() === apiScope),
    either.fromOption(() => new Error(`Failed to find the root directory for scope ${apiScope}`))
  );

export const resolveLiteralValue = (expression: Node) =>
  either.tryCatch(() => expression.getType().getLiteralValueOrThrow(), wrapError);

export const getPropertyInitializer =
  (key: string) => (objectLiteralExpression: ObjectLiteralExpression) =>
    fn.pipe(
      objectLiteralExpression.getProperty(key),
      either.fromNullable(
        new Error('Failed to read the path property assigment: no such property')
      ),
      either.filterOrElse(
        isPropertyAssignment,
        (node) =>
          new Error(`Failed to read the path property assignment: can't handle node type ${node}`)
      ),
      either.chain((pathAssignment) =>
        either.tryCatch(() => pathAssignment.getInitializerOrThrow(), wrapError)
      )
    );

export const getFeatureLocation = (node: Node): FeatureLocation => ({
  sourceFilePath: node.getSourceFile().getFilePath(),
  lineNumber: node.getStartLineNumber(),
});

export const wrapError = (e: unknown): Error => (e instanceof Error ? e : new Error(`${e}`));

const isPropertyAssignment = (
  node: Node
): node is PropertyAssignment | ShorthandPropertyAssignment =>
  Node.isPropertyAssignment(node) || Node.isShorthandPropertyAssignment(node);
