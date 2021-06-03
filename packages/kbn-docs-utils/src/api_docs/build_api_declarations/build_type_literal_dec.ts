/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { TypeLiteralNode } from 'ts-morph';
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';

/**
 * This captures function parameters that are object types, and makes sure their
 * properties are recursively walked so they are expandable in the docs.
 *
 * The test verifying `crazyFunction` will fail without this special handling.
 *
 * @param node
 * @param plugins
 * @param anchorLink
 * @param log
 * @param name
 */
export function buildTypeLiteralDec(
  node: TypeLiteralNode,
  plugins: KibanaPlatformPlugin[],
  anchorLink: AnchorLink,
  currentPluginId: string,
  log: ToolingLog,
  name: string,
  captureReferences: boolean
): ApiDeclaration {
  return {
    ...buildBasicApiDeclaration({
      currentPluginId,
      anchorLink,
      node,
      plugins,
      log,
      captureReferences,
      apiName: name,
    }),
    type: TypeKind.ObjectKind,
    children: node.getMembers().map((m) =>
      buildApiDeclaration({
        node: m,
        plugins,
        log,
        currentPluginId: anchorLink.pluginName,
        scope: anchorLink.scope,
        captureReferences,
        parentApiId: anchorLink.apiName,
      })
    ),
    // Override the signature, we don't want it for objects, it'll get too big.
    signature: undefined,
  };
}
