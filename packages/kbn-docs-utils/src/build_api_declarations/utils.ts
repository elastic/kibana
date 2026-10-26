/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ParameterDeclaration, ClassMemberTypes } from 'ts-morph';
import { Node } from 'ts-morph';
import type { BuildApiDecOpts } from './types';
import { isNamedNode } from '../tsmorph_utils';

// Collect any paths encountered that are not in the correct scope folder.
// APIs inside these folders will cause issues with the API docs system. The
// path will map to the plugin directory. It _should_ be the prefix of the path,
// but sometimes it is not!
export const pathsOutsideScopes: { [key: string]: string } = {};

export function isPrivate(node: ParameterDeclaration | ClassMemberTypes): boolean {
  if (Node.isModifierable(node)) {
    return node.getModifiers().find((mod) => mod.getText() === 'private') !== undefined;
  }
  return false;
}

/**
 * Change the absolute path into a relative one.
 */
export function getRelativePath(fullPath: string): string {
  return Path.relative(REPO_ROOT, fullPath);
}

export function getSourceForNode(node: Node): string {
  const path = getRelativePath(node.getSourceFile().getFilePath());
  return path;
}

export function getSourceLocationForNode(node: Node): {
  path: string;
  lineNumber: number;
  columnNumber: number;
} {
  const path = getRelativePath(node.getSourceFile().getFilePath());
  const { line, column } = node.getSourceFile().getLineAndColumnAtPos(node.getNonWhitespaceStart());
  return {
    path,
    lineNumber: line,
    columnNumber: column,
  };
}

export function buildApiId(id: string, parentId?: string): string {
  const clean = id.replace(/[^A-Za-z_.$0-9]+/g, '');
  return parentId ? `${parentId}.${clean}` : clean;
}

export function buildParentApiId(parentName: string, parentsParentApiId?: string) {
  return parentsParentApiId ? `${parentsParentApiId}.${parentName}` : parentName;
}

export function getOptsForChild(node: Node, parentOpts: BuildApiDecOpts): BuildApiDecOpts {
  const name = Node.isConstructSignatureDeclaration(node)
    ? 'new'
    : isNamedNode(node)
    ? node.getName()
    : 'Unnamed';
  return getOptsForChildWithName(name, parentOpts);
}

export function getOptsForChildWithName(
  name: string,
  parentOpts: BuildApiDecOpts
): BuildApiDecOpts {
  return {
    ...parentOpts,
    name,
    id: buildApiId(name, parentOpts.id),
  };
}
