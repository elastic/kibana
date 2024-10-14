/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Node, Signature } from 'ts-morph';
import { ApiDeclaration } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { getJSDocParamComment, getJSDocReturnTagComment } from './js_doc_utils';
import { BuildApiDecOpts } from './types';
import { buildApiId, getOptsForChildWithName } from './utils';

export function buildCallSignatureDec(node: Node, signature: Signature, opts: BuildApiDecOpts) {
  return {
    ...buildBasicApiDeclaration(node, opts),
    returnComment: getJSDocReturnTagComment(node),
    children: signature.getParameters().reduce((kids, p, index) => {
      if (p.getDeclarations().length === 1) {
        kids.push({
          ...buildApiDeclaration(p.getDeclarations()[0], {
            ...getOptsForChildWithName(p.getName(), opts),
            id: buildApiId(`$${index + 1}`, opts.id),
          }),
          description: getJSDocParamComment(node, p.getName()),
        });
      } else {
        opts.log.warning(`Losing information on parameter ${p.getName()}`);
      }
      return kids;
    }, [] as ApiDeclaration[]),
  };
}
