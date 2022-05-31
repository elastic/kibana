/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IAnonymousPaths, IBasePath } from '..';
import { CoreService } from '../../types';

interface Deps {
  basePath: IBasePath;
}

export class AnonymousPathsService implements CoreService<IAnonymousPaths, IAnonymousPaths> {
  private readonly paths = new Set<string>();

  public setup({ basePath }: Deps) {
    return {
      isAnonymous: (path: string): boolean => {
        const pathWithoutBasePath = basePath.remove(path);
        return this.paths.has(normalizePath(pathWithoutBasePath));
      },

      register: (path: string) => {
        this.paths.add(normalizePath(path));
      },

      normalizePath,
    };
  }

  public start(deps: Deps) {
    return this.setup(deps);
  }

  public stop() {}
}

const normalizePath = (path: string) => {
  // always lower-case it
  let normalized = path.toLowerCase();

  // remove the slash from the end
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, normalized.length - 1);
  }

  // put a slash at the start
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // it's normalized!!!
  return normalized;
};
