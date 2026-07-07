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
import { buildApiDeclaration } from './build_api_declaration';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import {
  getJSDocParamComment,
  getJSDocReturnTagComment,
  getPluginContextForNode,
} from './js_doc_utils';
import type { BuildApiDecOpts } from './types';
import { buildApiId, getOptsForChildWithName } from './utils';

export function buildCallSignatureDec(node: Node, signature: Signature, opts: BuildApiDecOpts) {
  const pluginContext = getPluginContextForNode(node, opts);
  return {
    ...buildBasicApiDeclaration(node, opts),
    returnComment: getJSDocReturnTagComment(node, pluginContext),
    children: signature.getParameters().reduce((kids, p, index) => {
      if (p.getDeclarations().length === 1) {
        const decl = p.getDeclarations()[0];

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
      } else {
        opts.log.warning(`Losing information on parameter ${p.getName()}`);
      }
      return kids;
    }, [] as ApiDeclaration[]),
  };
}
