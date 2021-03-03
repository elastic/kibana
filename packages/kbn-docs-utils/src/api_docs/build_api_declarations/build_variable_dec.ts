/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import {
  VariableDeclaration,
  Node,
  PropertyAssignment,
  PropertyDeclaration,
  PropertySignature,
  ShorthandPropertyAssignment,
} from 'ts-morph';
import { getApiSectionId, isInternal } from '../utils';
import { getCommentsFromNode, getJSDocTagNames } from './js_doc_utils';
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { getArrowFunctionDec } from './build_arrow_fn_dec';
import { buildApiDeclaration } from './build_api_declaration';
import { getSourceForNode } from './utils';
import { getSignature } from './get_signature';
import { getTypeKind } from './get_type_kind';

/**
 * Special handling for objects and arrow functions which are variable or property node types.
 * Objects and arrow functions need their children extracted recursively. This uses the name from the
 * node, but checks for an initializer to get inline arrow functions and objects defined recursively.
 *
 * @param node
 * @param plugins
 * @param anchorLink
 * @param log
 */
export function buildVariableDec(
  node:
    | VariableDeclaration
    | PropertyAssignment
    | PropertyDeclaration
    | PropertySignature
    | ShorthandPropertyAssignment,
  plugins: KibanaPlatformPlugin[],
  anchorLink: AnchorLink,
  log: ToolingLog
): ApiDeclaration {
  const initializer = node.getInitializer();
  // Recusively list object properties as children.
  if (initializer && Node.isObjectLiteralExpression(initializer)) {
    return {
      id: getApiSectionId(anchorLink),
      type: TypeKind.ObjectKind,
      tags: getJSDocTagNames(node),
      children: initializer.getProperties().reduce((acc, prop) => {
        const child = buildApiDeclaration(
          prop,
          plugins,
          log,
          anchorLink.pluginName,
          anchorLink.scope,
          anchorLink.apiName
        );
        if (!isInternal(child)) {
          acc.push(child);
        }
        return acc;
      }, [] as ApiDeclaration[]),
      description: getCommentsFromNode(node),
      label: node.getName(),
      source: getSourceForNode(node),
    };
  } else if (initializer && Node.isArrowFunction(initializer)) {
    return getArrowFunctionDec(node, initializer, plugins, anchorLink, log);
  }

  // Otherwise return it just as a single entry.
  return {
    tags: getJSDocTagNames(node),
    id: getApiSectionId(anchorLink),
    type: getTypeKind(node),
    label: node.getName(),
    description: getCommentsFromNode(node),
    source: getSourceForNode(node),
    signature: getSignature(node, plugins, log),
  };
}
