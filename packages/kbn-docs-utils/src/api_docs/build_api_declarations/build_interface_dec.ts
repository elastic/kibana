/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { InterfaceDeclaration } from 'ts-morph';
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { getCommentsFromNode } from './js_doc_utils';
import { buildApiDeclaration } from './build_api_declaration';
import { getSourceForNode } from './utils';
import { getApiSectionId } from '../utils';
import { getSignature } from './get_signature';

export function buildInterfaceDec(
  node: InterfaceDeclaration,
  plugins: KibanaPlatformPlugin[],
  anchorLink: AnchorLink,
  log: ToolingLog
): ApiDeclaration {
  return {
    id: getApiSectionId(anchorLink),
    type: TypeKind.InterfaceKind,
    label: node.getName(),
    signature: getSignature(node, plugins, log),
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
