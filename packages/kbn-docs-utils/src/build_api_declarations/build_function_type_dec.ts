/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PropertySignature } from 'ts-morph';

import { FunctionTypeNode } from 'ts-morph';
import { buildApiDecsForParameters } from './build_parameter_decs';
import { ApiDeclaration, TypeKind } from '../types';
import { getJSDocReturnTagComment, getJSDocs } from './js_doc_utils';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { BuildApiDecOpts } from './types';

/**
 * Takes the various function-type node declaration types and converts them into an ApiDeclaration.
 */
export function buildFunctionTypeDec(
  node: PropertySignature,
  typeNode: FunctionTypeNode,
  opts: BuildApiDecOpts
): ApiDeclaration {
  const fn = {
    ...buildBasicApiDeclaration(node, opts),
    type: TypeKind.FunctionKind,
    children: buildApiDecsForParameters(typeNode.getParameters(), opts, getJSDocs(node)),
    returnComment: getJSDocReturnTagComment(node),
  };
  return fn;
}
