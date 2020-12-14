/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT, kibanaPackageJSON } from '@kbn/utils';
import { ParameterDeclaration, ClassMemberTypes, Node } from 'ts-morph';
import { SourceLink } from '../types';

export function isPrivate(node: ParameterDeclaration | ClassMemberTypes): boolean {
  return node.getModifiers().find((mod) => mod.getText() === 'private') !== undefined;
}

/**
 * Change the absolute path into a relative one.
 */
function getRelativePath(fullPath: string): string {
  const index = fullPath.indexOf(REPO_ROOT);
  if (index >= 0) {
    return fullPath.slice(REPO_ROOT.length);
  } else {
    return fullPath;
  }
}

export function getSourceForNode(node: Node): SourceLink {
  const path = getRelativePath(node.getSourceFile().getFilePath());
  const lineNumber = node.getStartLineNumber();
  return {
    path,
    lineNumber,
    link: `https://github.com/elastic/kibana/tree/${kibanaPackageJSON.branch}${path}#L${lineNumber}`,
  };
}
