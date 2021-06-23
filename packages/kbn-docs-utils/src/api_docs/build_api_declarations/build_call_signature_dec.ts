/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin, ToolingLog } from '@kbn/dev-utils';
import { Node, Signature } from 'ts-morph';
import { AnchorLink, ApiDeclaration } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { getJSDocParamComment, getJSDocReturnTagComment } from './js_doc_utils';

export function buildCallSignatureDec({
  signature,
  node,
  plugins,
  captureReferences,
  currentPluginId,
  anchorLink,
  log,
  name,
}: {
  signature: Signature;
  name: string;
  plugins: KibanaPlatformPlugin[];
  anchorLink: AnchorLink;
  log: ToolingLog;
  captureReferences: boolean;
  currentPluginId: string;
  node: Node;
}) {
  return {
    ...buildBasicApiDeclaration({
      node,
      plugins,
      anchorLink,
      apiName: name,
      currentPluginId,
      captureReferences,
      log,
    }),
    returnComment: getJSDocReturnTagComment(node),
    children: signature.getParameters().reduce((kids, p) => {
      if (p.getDeclarations().length === 1) {
        kids.push({
          ...buildApiDeclaration({
            node: p.getDeclarations()[0],
            log,
            captureReferences,
            plugins,
            scope: anchorLink.scope,
            name: p.getName(),
            currentPluginId,
          }),
          description: getJSDocParamComment(node, p.getName()),
        });
      } else {
        log.warning(`Losing information on parameter ${p.getName()}`);
      }
      return kids;
    }, [] as ApiDeclaration[]),
  };
}
