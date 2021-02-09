/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Node } from 'ts-morph';
import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { buildClassDec } from './build_class_dec';
import { buildFunctionDec } from './build_function_dec';
import { getCommentsFromNode } from './js_doc_utils';
import { isNamedNode } from '../tsmorph_utils';
import { AnchorLink, ApiDeclaration } from '../types';
import { buildVariableDec } from './build_variable_dec';
import { getApiSectionId } from '../utils';
import { getSourceForNode } from './utils';
import { buildTypeLiteralDec } from './build_type_literal_dec';
import { ApiScope } from '../types';
import { getSignature } from './get_signature';
import { buildInterfaceDec } from './build_interface_dec';
import { getTypeKind } from './get_type_kind';

/**
 * A potentially recursive function, depending on the node type, that builds a JSON like structure
 * that can be passed to the elastic-docs component for rendering as an API. Nodes like classes,
 * interfaces, objects and functions will have children for their properties, members and parameters.
 *
 * @param node The ts-morph node to build an ApiDeclaration for.
 * @param plugins The list of plugins registered is used for building cross plugin links by looking up
 * the plugin by import path. We could accomplish the same thing via a regex on the import path, but this lets us
 * decouple plugin path from plugin id.
 * @param parentAnchorLink Used to build a nested id for the API. If this is a top level plugin API, parentAnchorLink.apiId
 * will be undefined.
 * @param log Logs messages to console.
 * @param name An optional name to pass through which will be used instead of node.getName, if it
 * exists. For some types, like Parameters, the name comes on the parent node, but we want the doc def
 * to be built from the TypedNode
 */
export function buildApiDeclaration(
  node: Node,
  plugins: KibanaPlatformPlugin[],
  log: ToolingLog,
  pluginName: string,
  scope: ApiScope,
  parentApiId?: string,
  name?: string
): ApiDeclaration {
  const apiName = name ? name : isNamedNode(node) ? node.getName() : 'Unnamed';
  log.debug(`Building API Declaration for ${apiName} of kind ${node.getKindName()}`);
  const apiId = parentApiId ? parentApiId + '.' + apiName : apiName;
  const anchorLink: AnchorLink = { scope, pluginName, apiName: apiId };

  if (Node.isClassDeclaration(node)) {
    return buildClassDec(node, plugins, anchorLink, log);
  } else if (Node.isInterfaceDeclaration(node)) {
    return buildInterfaceDec(node, plugins, anchorLink, log);
  } else if (
    Node.isMethodSignature(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isConstructorDeclaration(node)
  ) {
    return buildFunctionDec(node, plugins, anchorLink, log);
  } else if (
    Node.isPropertySignature(node) ||
    Node.isPropertyDeclaration(node) ||
    Node.isShorthandPropertyAssignment(node) ||
    Node.isPropertyAssignment(node) ||
    Node.isVariableDeclaration(node)
  ) {
    return buildVariableDec(node, plugins, anchorLink, log);
  } else if (Node.isTypeLiteralNode(node)) {
    return buildTypeLiteralDec(node, plugins, anchorLink, log, apiName);
  }

  return {
    id: getApiSectionId(anchorLink),
    type: getTypeKind(node),
    label: apiName,
    description: getCommentsFromNode(node),
    source: getSourceForNode(node),
    signature: getSignature(node, plugins, log),
  };
}
