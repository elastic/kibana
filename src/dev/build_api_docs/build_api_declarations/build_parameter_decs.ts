/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ParameterDeclaration, JSDoc, SyntaxKind } from 'ts-morph';
import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { extractImportReferences } from './extract_import_refs';
import { AnchorLink, ApiDeclaration } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { getJSDocParamComment } from './js_doc_utils';
import { getSourceForNode } from './utils';
import { getTypeKind } from './get_type_kind';

/**
 * A helper function to capture function parameters, whether it comes from an arrow function, a regular function or
 * a function type.
 *
 * @param params
 * @param plugins
 * @param anchorLink
 * @param log
 * @param jsDocs
 */
export function buildApiDecsForParameters(
  params: ParameterDeclaration[],
  plugins: KibanaPlatformPlugin[],
  anchorLink: AnchorLink,
  log: ToolingLog,
  jsDocs?: JSDoc[]
): ApiDeclaration[] {
  return params.reduce((acc, param) => {
    const label = param.getName();
    log.debug(`Getting parameter doc def for ${label} of kind ${param.getKindName()}`);
    // Literal types are non primitives that aren't references to other types. We add them as a more
    // defined node, with children.
    // If we don't want the docs to be too deeply nested we could avoid this special handling.
    if (param.getTypeNode() && param.getTypeNode()!.getKind() === SyntaxKind.TypeLiteral) {
      acc.push(
        buildApiDeclaration(
          param.getTypeNode()!,
          plugins,
          log,
          anchorLink.pluginName,
          anchorLink.scope,
          anchorLink.apiName,
          label
        )
      );
    } else {
      acc.push({
        type: getTypeKind(param),
        label,
        isRequired: param.getType().isNullable() === false,
        signature: extractImportReferences(param.getType().getText(), plugins, log),
        description: jsDocs ? getJSDocParamComment(jsDocs, label) : [],
        source: getSourceForNode(param),
      });
    }
    return acc;
  }, [] as ApiDeclaration[]);
}
