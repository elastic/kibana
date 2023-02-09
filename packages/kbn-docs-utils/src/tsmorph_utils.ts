/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Node, SourceFile, Project, ReferenceFindableNode } from 'ts-morph';

export interface NamedNode extends Node {
  getName(): string;
}

/**
 * ts-morph has a Node.isNamedNode fn but it isn't returning true for all types
 * that will have node.getName.
 */
export function isNamedNode(node: Node | NamedNode | ReferenceFindableNode): node is NamedNode {
  return (node as NamedNode).getName !== undefined;
}

/**
 * Helper function to find a source file at a given location. Used to extract
 * index.ts files at a given scope.
 *
 * @param project The ts morph project which contains all the source files
 * @param absolutePath The absolute path of the file we want to find
 * @returns a source file that exists at the location of the relative path.
 */
export function getSourceFileMatching(
  project: Project,
  absolutePath: string
): SourceFile | undefined {
  return project.getSourceFiles().find((file) => {
    return file.getFilePath().startsWith(absolutePath);
  });
}
