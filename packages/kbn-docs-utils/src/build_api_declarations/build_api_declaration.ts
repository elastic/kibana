/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionTypeNode } from 'ts-morph';
import { Node } from 'ts-morph';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildClassDec } from './build_class_dec';
import { buildFunctionDec } from './build_function_dec';
import { isNamedNode } from '../tsmorph_utils';
import type { ApiDeclaration, PluginOrPackage } from '../types';
import { buildVariableDec } from './build_variable_dec';
import { buildTypeLiteralDec } from './build_type_literal_dec';
import type { ApiScope } from '../types';
import { buildInterfaceDec } from './build_interface_dec';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { buildFunctionTypeDec } from './build_function_type_dec';
import { buildCallSignatureDec } from './build_call_signature_dec';
import { buildMultipleCallSignaturesDec } from './build_multiple_call_signatures_dec';
import type { BuildApiDecOpts } from './types';
import { buildApiId } from './utils';

export function buildApiDeclarationTopNode(
  node: Node,
  opts: {
    plugins: PluginOrPackage[];
    log: ToolingLog;
    currentPluginId: string;
    captureReferences: boolean;
    parentApiId?: string;
    scope: ApiScope;
  }
) {
  const name = isNamedNode(node) ? node.getName() : 'Unnamed';
  return buildApiDeclaration(node, {
    ...opts,
    name,
    id: buildApiId(name, `def-${opts.scope}`),
  });
}

/**
 * A potentially recursive function, depending on the node type, that builds a JSON like structure
 * that can be passed to the elastic-docs component for rendering as an API. Nodes like classes,
 * interfaces, objects and functions will have children for their properties, members and parameters.
 *
 * @param node The ts-morph node to build an ApiDeclaration for.
 * @param opts Various options and settings
 */
export function buildApiDeclaration(node: Node, opts: BuildApiDecOpts): ApiDeclaration {
  if (Node.isClassDeclaration(node)) {
    return buildClassDec(node, opts);
  } else if (Node.isInterfaceDeclaration(node)) {
    return buildInterfaceDec(node, opts);
  } else if (
    Node.isPropertySignature(node) &&
    node.getTypeNode() &&
    Node.isFunctionTypeNode(node.getTypeNode()!)
  ) {
    // This code path covers optional properties on interfaces, otherwise they lost their children. Yes, a bit strange.
    return buildFunctionTypeDec(node, node.getTypeNode()! as FunctionTypeNode, opts);
  } else if (
    Node.isMethodSignature(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isConstructSignatureDeclaration(node) ||
    Node.isConstructorDeclaration(node) ||
    Node.isCallSignatureDeclaration(node)
  ) {
    return buildFunctionDec(node, {
      ...opts,
      // Use appropriate name based on node type
      name: Node.isConstructSignatureDeclaration(node)
        ? 'new'
        : Node.isConstructorDeclaration(node)
        ? 'Constructor'
        : Node.isCallSignatureDeclaration(node)
        ? 'Unnamed'
        : node.getName() || 'Unnamed',
    });
  } else if (
    Node.isPropertySignature(node) ||
    Node.isPropertyDeclaration(node) ||
    Node.isShorthandPropertyAssignment(node) ||
    Node.isPropertyAssignment(node) ||
    Node.isVariableDeclaration(node)
  ) {
    return buildVariableDec(node, opts);
  } else if (Node.isTypeLiteral(node)) {
    return buildTypeLiteralDec(node, opts);
  }

  // Without this types that are functions won't include comments on parameters. e.g.
  // /**
  //  * @param t A parameter
  //  */
  // export type AFn = (t: string) => void;
  //
  const callSignatures = node.getType().getCallSignatures();
  if (callSignatures.length === 1) {
    return buildCallSignatureDec(node, callSignatures[0], opts);
  } else if (callSignatures.length > 1) {
    return buildMultipleCallSignaturesDec(node, callSignatures, opts);
  }

  return buildBasicApiDeclaration(node, opts);
}
