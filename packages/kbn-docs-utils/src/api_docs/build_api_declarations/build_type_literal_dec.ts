/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { TypeLiteralNode } from 'ts-morph';
import { getApiSectionId } from '../utils';
import { getCommentsFromNode } from './js_doc_utils';
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { getSourceForNode } from './utils';

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
  log: ToolingLog,
  name: string
): ApiDeclaration {
  return {
    id: getApiSectionId(anchorLink),
    type: TypeKind.ObjectKind,
    label: name,
    description: getCommentsFromNode(node),
    children: node
      .getMembers()
      .map((m) =>
        buildApiDeclaration(
          m,
          plugins,
          log,
          anchorLink.pluginName,
          anchorLink.scope,
          anchorLink.apiName
        )
      ),
    source: getSourceForNode(node),
  };
}
