/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeLiteralNode } from 'ts-morph';
import { ApiDeclaration, TypeKind } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { BuildApiDecOpts } from './types';
import { getOptsForChild } from './utils';

/**
 * This captures function parameters that are object types, and makes sure their
 * properties are recursively walked so they are expandable in the docs.
 *
 * The test verifying `crazyFunction` will fail without this special handling.
 */
export function buildTypeLiteralDec(node: TypeLiteralNode, opts: BuildApiDecOpts): ApiDeclaration {
  return {
    ...buildBasicApiDeclaration(node, opts),
    type: TypeKind.ObjectKind,
    children: node.getMembers().map((m) => buildApiDeclaration(m, getOptsForChild(m, opts))),
    // Override the signature, we don't want it for objects, it'll get too big.
    signature: undefined,
  };
}
