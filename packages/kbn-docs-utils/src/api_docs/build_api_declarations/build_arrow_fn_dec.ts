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
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { buildApiDecsForParameters } from './build_parameter_decs';
import { getSignature } from './get_signature';
import { getJSDocReturnTagComment, getJSDocs } from './js_doc_utils';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';

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
 * @param captureReferences if false, references will only be captured for deprecated APIs. Capturing references
 * can be time consuming so this is only set to true if explicitly requested via the `--references` flag
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
  currentPluginId: string,
  log: ToolingLog,
  captureReferences: boolean
): ApiDeclaration {
  return {
    ...buildBasicApiDeclaration({
      currentPluginId,
      anchorLink,
      node,
      plugins,
      captureReferences,
      log,
      apiName: node.getName(),
    }),
    type: TypeKind.FunctionKind,
    children: buildApiDecsForParameters(
      initializer.getParameters(),
      plugins,
      anchorLink,
      currentPluginId,
      log,
      captureReferences,
      getJSDocs(node)
    ),
    // need to override the signature - use the initializer, not the node.
    signature: getSignature(initializer, plugins, log),
    returnComment: getJSDocReturnTagComment(node),
  };
}
