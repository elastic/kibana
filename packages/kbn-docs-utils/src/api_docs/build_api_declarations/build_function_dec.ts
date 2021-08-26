/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FunctionDeclaration,
  MethodDeclaration,
  ConstructorDeclaration,
  Node,
  MethodSignature,
} from 'ts-morph';

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { buildApiDecsForParameters } from './build_parameter_decs';
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { getJSDocReturnTagComment, getJSDocs } from './js_doc_utils';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';

/**
 * Takes the various function-like node declaration types and converts them into an ApiDeclaration.
 * @param node
 * @param plugins
 * @param anchorLink
 * @param log
 */
export function buildFunctionDec({
  node,
  plugins,
  anchorLink,
  currentPluginId,
  log,
  captureReferences,
}: {
  node: FunctionDeclaration | MethodDeclaration | ConstructorDeclaration | MethodSignature;
  plugins: KibanaPlatformPlugin[];
  anchorLink: AnchorLink;
  currentPluginId: string;
  log: ToolingLog;
  captureReferences: boolean;
}): ApiDeclaration {
  const label = Node.isConstructorDeclaration(node)
    ? 'Constructor'
    : node.getName() || '(WARN: Missing name)';
  const fn = {
    ...buildBasicApiDeclaration({
      currentPluginId,
      anchorLink,
      node,
      captureReferences,
      plugins,
      log,
      apiName: label,
    }),
    type: TypeKind.FunctionKind,
    children: buildApiDecsForParameters(
      node.getParameters(),
      plugins,
      anchorLink,
      currentPluginId,
      log,
      captureReferences,
      getJSDocs(node)
    ),
    returnComment: getJSDocReturnTagComment(node),
  };
  return fn;
}
