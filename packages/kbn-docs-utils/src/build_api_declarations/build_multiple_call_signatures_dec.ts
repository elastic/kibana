/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node, Signature } from 'ts-morph';
import { Node as MorphNode } from 'ts-morph';
import type { ApiDeclaration } from '../types';
import { TypeKind } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import {
  getJSDocParamComment,
  getJSDocReturnTagComment,
  getPluginContextForNode,
} from './js_doc_utils';
import type { BuildApiDecOpts } from './types';
import { buildApiId, getOptsForChildWithName } from './utils';

/**
 * Builds an {@link ApiDeclaration} for a node with multiple call signatures (function overloads).
 * Parameters are extracted from the first signature to provide structured documentation,
 * while all overload signatures are included in the type information.
 *
 * @param node The ts-morph node with multiple call signatures.
 * @param signatures Array of all call signatures for the node.
 * @param opts Build options including logging and plugin context.
 * @returns An ApiDeclaration representing the overloaded function/type.
 */
export const buildMultipleCallSignaturesDec = (
  node: Node,
  signatures: Signature[],
  opts: BuildApiDecOpts
): ApiDeclaration => {
  const pluginContext = getPluginContextForNode(node, opts);

  // Use the first signature to extract parameter children for documentation.
  // This is a reasonable default since overloads typically share common parameters.
  const primarySignature = signatures[0];

  const children = primarySignature.getParameters().reduce((kids, p, index) => {
    const declarations = p.getDeclarations();
    if (declarations.length >= 1) {
      const decl = declarations[0];

      // TypeScript uses synthetic names like `__0` for destructured parameters.
      // Prefer the written name from the ParameterDeclaration when available.
      const symbolName = p.getName();
      const writtenName = MorphNode.isParameterDeclaration(decl) ? decl.getName() : symbolName;
      const lookupNames = writtenName !== symbolName ? [writtenName, symbolName] : [symbolName];

      kids.push({
        ...buildApiDeclaration(decl, {
          ...getOptsForChildWithName(writtenName, opts),
          id: buildApiId(`$${index + 1}`, opts.id),
        }),
        description: getJSDocParamComment(node, lookupNames, pluginContext),
      });
    }
    return kids;
  }, [] as ApiDeclaration[]);

  return {
    ...buildBasicApiDeclaration(node, opts),
    type: TypeKind.FunctionKind,
    returnComment: getJSDocReturnTagComment(node, pluginContext),
    children,
  };
};
