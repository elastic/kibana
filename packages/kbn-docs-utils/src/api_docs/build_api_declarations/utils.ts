/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Path from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { ParameterDeclaration, ClassMemberTypes, Node } from 'ts-morph';
import { SourceLink } from '../types';

// Collect any paths encountered that are not in the correct scope folder.
// APIs inside these folders will cause issues with the API docs system. The
// path will map to the plugin directory. It _should_ be the prefix of the path,
// but sometimes it is not!
export const pathsOutsideScopes: { [key: string]: string } = {};

export function isPrivate(node: ParameterDeclaration | ClassMemberTypes): boolean {
  return node.getModifiers().find((mod) => mod.getText() === 'private') !== undefined;
}

/**
 * Change the absolute path into a relative one.
 */
export function getRelativePath(fullPath: string): string {
  return Path.relative(REPO_ROOT, fullPath);
}

export function getSourceForNode(node: Node): SourceLink {
  const path = getRelativePath(node.getSourceFile().getFilePath());
  const lineNumber = node.getStartLineNumber();
  return {
    path,
    lineNumber,
  };
}
