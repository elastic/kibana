/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { FunctionTypeNode, JSDoc } from 'ts-morph';
import { getApiSectionId } from '../utils';
import { getCommentsFromNode } from './js_doc_utils';
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { buildApiDecsForParameters } from './build_parameter_decs';
import { extractImportReferences } from './extract_import_refs';
import { getJSDocReturnTagComment, getJSDocs, getJSDocTagNames } from './js_doc_utils';
import { getSourceForNode } from './utils';

export function buildApiDecFromFunctionType(
  name: string,
  node: FunctionTypeNode,
  plugins: KibanaPlatformPlugin[],
  anchorLink: AnchorLink,
  log: ToolingLog,
  jsDocs?: JSDoc[]
): ApiDeclaration {
  log.debug(`Getting Function Type doc def for node ${name} of kind ${node.getKindName()}`);
  return {
    type: TypeKind.FunctionKind,
    id: getApiSectionId(anchorLink),
    label: name,
    signature: extractImportReferences(node.getType().getText(), plugins, log),
    description: getCommentsFromNode(node),
    tags: jsDocs ? getJSDocTagNames(jsDocs) : [],
    returnComment: jsDocs ? getJSDocReturnTagComment(jsDocs) : [],
    children: buildApiDecsForParameters(
      node.getParameters(),
      plugins,
      anchorLink,
      log,
      jsDocs || getJSDocs(node)
    ),
    source: getSourceForNode(node),
  };
}
