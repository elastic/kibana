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
import { getCommentsFromNode } from './js_doc_utils';
import { getApiSectionId } from '../utils';
import { getJSDocReturnTagComment, getJSDocs, getJSDocTagNames } from './js_doc_utils';
import { getSourceForNode } from './utils';
import { getSignature } from './get_signature';

/**
 * Takes the various function-like node declaration types and converts them into an ApiDeclaration.
 * @param node
 * @param plugins
 * @param anchorLink
 * @param log
 */
export function buildFunctionDec(
  node: FunctionDeclaration | MethodDeclaration | ConstructorDeclaration | MethodSignature,
  plugins: KibanaPlatformPlugin[],
  anchorLink: AnchorLink,
  log: ToolingLog
): ApiDeclaration {
  const label = Node.isConstructorDeclaration(node)
    ? 'Constructor'
    : node.getName() || '(WARN: Missing name)';
  log.debug(`Getting function doc def for node ${label} of kind ${node.getKindName()}`);
  return {
    id: getApiSectionId(anchorLink),
    type: TypeKind.FunctionKind,
    label,
    signature: getSignature(node, plugins, log),
    description: getCommentsFromNode(node),
    children: buildApiDecsForParameters(
      node.getParameters(),
      plugins,
      anchorLink,
      log,
      getJSDocs(node)
    ),
    tags: getJSDocTagNames(node),
    returnComment: getJSDocReturnTagComment(node),
    source: getSourceForNode(node),
  };
}
