/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ArrowFunction,
  VariableDeclaration,
  PropertyDeclaration,
  PropertySignature,
  ShorthandPropertyAssignment,
  PropertyAssignment,
} from 'ts-morph';
import { ApiDeclaration, TypeKind } from '../types';
import { buildApiDecsForParameters } from './build_parameter_decs';
import { getSignature } from './get_signature';
import { getJSDocReturnTagComment, getJSDocs } from './js_doc_utils';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { BuildApiDecOpts } from './types';

/**
 * Arrow functions are handled differently than regular functions because you need the arrow function
 * initializer as well as the node. The initializer is where the parameters are grabbed from and the
 * signature, while the node has the comments and name.
 */
export function getArrowFunctionDec(
  node:
    | VariableDeclaration
    | PropertyDeclaration
    | PropertySignature
    | ShorthandPropertyAssignment
    | PropertyAssignment,
  initializer: ArrowFunction,
  opts: BuildApiDecOpts
): ApiDeclaration {
  return {
    ...buildBasicApiDeclaration(node, opts),
    type: TypeKind.FunctionKind,
    children: buildApiDecsForParameters(initializer.getParameters(), opts, getJSDocs(node)),
    // need to override the signature - use the initializer, not the node.
    signature: getSignature(initializer, opts.plugins, opts.log),
    returnComment: getJSDocReturnTagComment(node),
  };
}
