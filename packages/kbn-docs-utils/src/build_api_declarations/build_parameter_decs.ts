/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ParameterDeclaration, JSDoc, SyntaxKind } from 'ts-morph';
import { extractImportReferences } from './extract_import_refs';
import { ApiDeclaration } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { getJSDocParamComment } from './js_doc_utils';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { BuildApiDecOpts } from './types';
import { buildApiId, getOptsForChild } from './utils';

/**
 * A helper function to capture function parameters, whether it comes from an arrow function, a regular function or
 * a function type.
 */
export function buildApiDecsForParameters(
  params: ParameterDeclaration[],
  parentOpts: BuildApiDecOpts,
  jsDocs?: JSDoc[]
): ApiDeclaration[] {
  return params.reduce((acc, param, index) => {
    const id = buildApiId(`$${index + 1}`, parentOpts.id);
    const opts = {
      ...getOptsForChild(param, parentOpts),
      id,
    };

    opts.log.debug(`Getting parameter doc def for ${opts.name} of kind ${param.getKindName()}`);
    // Literal types are non primitives that aren't references to other types. We add them as a more
    // defined node, with children.
    // If we don't want the docs to be too deeply nested we could avoid this special handling.
    if (param.getTypeNode() && param.getTypeNode()!.getKind() === SyntaxKind.TypeLiteral) {
      acc.push(buildApiDeclaration(param.getTypeNode()!, opts));
    } else {
      const apiDec = buildBasicApiDeclaration(param, opts);
      acc.push({
        ...apiDec,
        isRequired: param.getType().isNullable() === false,
        signature: extractImportReferences(param.getType().getText(), opts.plugins, opts.log),
        description: jsDocs ? getJSDocParamComment(jsDocs, opts.name) : [],
      });
    }
    return acc;
  }, [] as ApiDeclaration[]);
}
