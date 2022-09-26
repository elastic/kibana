/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { Path } from '@kbn/type-summarizer-core';
import isPathInside from 'is-path-inside';

/**
 * Wrapper class around helpers for determining information
 * about source files.
 */
export class SourceFileMapper {
  constructor(private readonly dtsDir: string) {}

  getAbsolute(node: ts.Node) {
    return node.getSourceFile().fileName;
  }

  isNodeModule(path: string) {
    return (
      isPathInside(path, this.dtsDir) ? Path.relative(this.dtsDir, path) : Path.toNormal(path)
    )
      .split('/')
      .includes('node_modules');
  }

  isExternal(node: ts.Node) {
    const path = this.getAbsolute(node);
    return this.isNodeModule(path);
  }
}
