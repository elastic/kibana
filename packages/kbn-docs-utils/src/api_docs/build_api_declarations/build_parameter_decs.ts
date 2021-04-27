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
import { getApiSectionId } from '../utils';

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
  parentAnchorLink: AnchorLink,
  log: ToolingLog,
  jsDocs?: JSDoc[]
): ApiDeclaration[] {
  let paramIndex = 0;
  return params.reduce((acc, param) => {
    paramIndex++;
    const apiName = param.getName();
    // Destructured parameters can make these ids look ugly. Instead of parameter name, use an index for the position.
    const apiId = parentAnchorLink.apiName
      ? parentAnchorLink.apiName + `.$${paramIndex}`
      : `$${paramIndex}`;
    const anchorLink: AnchorLink = {
      scope: parentAnchorLink.scope,
      pluginName: parentAnchorLink.pluginName,
      apiName: apiId,
    };
    log.debug(`Getting parameter doc def for ${apiName} of kind ${param.getKindName()}`);
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
          apiName
        )
      );
    } else {
      acc.push({
        id: getApiSectionId(anchorLink),
        type: getTypeKind(param),
        label: apiName,
        isRequired: param.getType().isNullable() === false,
        signature: extractImportReferences(param.getType().getText(), plugins, log),
        description: jsDocs ? getJSDocParamComment(jsDocs, apiName) : [],
        source: getSourceForNode(param),
      });
    }
    return acc;
  }, [] as ApiDeclaration[]);
}
