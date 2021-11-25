/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  VariableDeclaration,
  Node,
  PropertyAssignment,
  PropertyDeclaration,
  PropertySignature,
  ShorthandPropertyAssignment,
} from 'ts-morph';
import { isInternal } from '../utils';
import { ApiDeclaration, TypeKind } from '../types';
import { getArrowFunctionDec } from './build_arrow_fn_dec';
import { buildApiDeclaration } from './build_api_declaration';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { buildCallSignatureDec } from './build_call_signature_dec';
import { BuildApiDecOpts } from './types';
import { getOptsForChild } from './utils';

/**
 * Special handling for objects and arrow functions which are variable or property node types.
 * Objects and arrow functions need their children extracted recursively. This uses the name from the
 * node, but checks for an initializer to get inline arrow functions and objects defined recursively.
 */
export function buildVariableDec(
  node:
    | VariableDeclaration
    | PropertyAssignment
    | PropertyDeclaration
    | PropertySignature
    | ShorthandPropertyAssignment,
  opts: BuildApiDecOpts
): ApiDeclaration {
  const initializer = node.getInitializer();
  if (initializer && Node.isObjectLiteralExpression(initializer)) {
    // Recursively list object properties as children.
    return {
      ...buildBasicApiDeclaration(node, opts),
      type: TypeKind.ObjectKind,
      children: initializer.getProperties().reduce((acc, prop) => {
        const child = buildApiDeclaration(prop, getOptsForChild(prop, opts));
        if (!isInternal(child)) {
          acc.push(child);
        }
        return acc;
      }, [] as ApiDeclaration[]),
      // Clear out the signature, we don't want it for objects, relying on the children properties will be enough.
      signature: undefined,
    };
  } else if (initializer && Node.isArrowFunction(initializer)) {
    return getArrowFunctionDec(node, initializer, opts);
  }

  // Without this the test "Property on interface pointing to generic function type exported with link" will fail.
  if (node.getType().getCallSignatures().length > 0) {
    if (node.getType().getCallSignatures().length > 1) {
      opts.log.warning(`Not handling more than one call signature for node ${node.getName()}`);
    } else {
      return buildCallSignatureDec(node, node.getType().getCallSignatures()[0], opts);
    }
  }

  return buildBasicApiDeclaration(node, opts);
}
