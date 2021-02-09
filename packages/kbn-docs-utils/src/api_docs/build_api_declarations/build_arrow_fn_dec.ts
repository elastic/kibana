/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';

import {
  ArrowFunction,
  VariableDeclaration,
  PropertyDeclaration,
  PropertySignature,
  ShorthandPropertyAssignment,
  PropertyAssignment,
} from 'ts-morph';
import { getApiSectionId } from '../utils';
import { getCommentsFromNode } from './js_doc_utils';
import { AnchorLink, TypeKind } from '../types';
import { getSourceForNode } from './utils';
import { buildApiDecsForParameters } from './build_parameter_decs';
import { getSignature } from './get_signature';
import { getJSDocReturnTagComment } from './js_doc_utils';

/**
 * Arrow functions are handled differently than regular functions because you need the arrow function
 * initializer as well as the node. The initializer is where the parameters are grabbed from and the
 * signature, while the node has the comments and name.
 *
 * @param node
 * @param initializer
 * @param plugins
 * @param anchorLink
 * @param log
 */
export function getArrowFunctionDec(
  node:
    | VariableDeclaration
    | PropertyDeclaration
    | PropertySignature
    | ShorthandPropertyAssignment
    | PropertyAssignment,
  initializer: ArrowFunction,
  plugins: KibanaPlatformPlugin[],
  anchorLink: AnchorLink,
  log: ToolingLog
) {
  log.debug(
    `Getting Arrow Function doc def for node ${node.getName()} of kind ${node.getKindName()}`
  );
  return {
    id: getApiSectionId(anchorLink),
    type: TypeKind.FunctionKind,
    children: buildApiDecsForParameters(initializer.getParameters(), plugins, anchorLink, log),
    signature: getSignature(initializer, plugins, log),
    description: getCommentsFromNode(node),
    label: node.getName(),
    source: getSourceForNode(node),
    returnComment: getJSDocReturnTagComment(node),
  };
}
