/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InterfaceDeclaration } from 'ts-morph';
import { ApiDeclaration, TypeKind } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { isInternal } from '../utils';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { BuildApiDecOpts } from './types';
import { getOptsForChild } from './utils';

export function buildInterfaceDec(
  node: InterfaceDeclaration,
  opts: BuildApiDecOpts
): ApiDeclaration {
  return {
    ...buildBasicApiDeclaration(node, {
      ...opts,
      name: node.getName(),
    }),
    type: TypeKind.InterfaceKind,
    children: node.getMembers().reduce((acc, m) => {
      const child = buildApiDeclaration(m, getOptsForChild(m, opts));
      if (!isInternal(child)) {
        acc.push(child);
      }
      return acc;
    }, [] as ApiDeclaration[]),
  };
}
