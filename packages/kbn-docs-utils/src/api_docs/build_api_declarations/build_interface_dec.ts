/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { InterfaceDeclaration } from 'ts-morph';
import { AnchorLink, ApiDeclaration, TypeKind } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { isInternal } from '../utils';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';

export function buildInterfaceDec(
  node: InterfaceDeclaration,
  plugins: KibanaPlatformPlugin[],
  anchorLink: AnchorLink,
  currentPluginId: string,
  log: ToolingLog,
  captureReferences: boolean
): ApiDeclaration {
  return {
    ...buildBasicApiDeclaration({
      currentPluginId,
      anchorLink,
      node,
      plugins,
      log,
      captureReferences,
      apiName: node.getName(),
    }),
    type: TypeKind.InterfaceKind,
    children: node.getMembers().reduce((acc, m) => {
      const child = buildApiDeclaration({
        node: m,
        plugins,
        log,
        currentPluginId: anchorLink.pluginName,
        scope: anchorLink.scope,
        captureReferences,
        parentApiId: anchorLink.apiName,
      });
      if (!isInternal(child)) {
        acc.push(child);
      }
      return acc;
    }, [] as ApiDeclaration[]),
  };
}
