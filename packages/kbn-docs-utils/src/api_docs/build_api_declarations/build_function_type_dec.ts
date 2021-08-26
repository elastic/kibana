/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PropertySignature } from 'ts-morph';

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { FunctionTypeNode } from 'ts-morph';
import { buildApiDecsForParameters } from './build_parameter_decs';
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { getJSDocReturnTagComment, getJSDocs } from './js_doc_utils';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';

/**
 * Takes the various function-type node declaration types and converts them into an ApiDeclaration.
 */
export function buildFunctionTypeDec({
  node,
  typeNode,
  plugins,
  anchorLink,
  currentPluginId,
  log,
  captureReferences,
}: {
  node: PropertySignature;
  typeNode: FunctionTypeNode;
  plugins: KibanaPlatformPlugin[];
  anchorLink: AnchorLink;
  currentPluginId: string;
  log: ToolingLog;
  captureReferences: boolean;
}): ApiDeclaration {
  const fn = {
    ...buildBasicApiDeclaration({
      currentPluginId,
      anchorLink,
      node,
      captureReferences,
      plugins,
      log,
      apiName: node.getName(),
    }),
    type: TypeKind.FunctionKind,
    children: buildApiDecsForParameters(
      typeNode.getParameters(),
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
