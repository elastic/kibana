/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ModuleType } from '@kbn/repo-source-classifier';
import normalizePath from 'normalize-path';

type RecursiveTypes = Map<string, ModuleType | RecursiveTypes>;

interface PrintOpts {
  expand: boolean;
}

export class TypeTree {
  private dirs = new Map<string, TypeTree>();
  private files = new Map<string, ModuleType>();

  constructor(public readonly path: string[] = []) {}

  add(type: ModuleType, rel: string) {
    const segs = normalizePath(rel).split('/').filter(Boolean);

    let node: TypeTree = this;
    const path = [];
    for (const dirSeg of segs.slice(0, -1)) {
      path.push(dirSeg);
      const existing = node.dirs.get(dirSeg);
      if (existing) {
        node = existing;
      } else {
        const newDir = new TypeTree([...node.path, dirSeg]);
        node.dirs.set(dirSeg, newDir);
        node = newDir;
      }
    }

    const filename = segs.at(-1);
    if (!filename) {
      throw new Error(`invalid rel path [${rel}]`);
    }

    node.files.set(filename, type);
  }

  flatten(options: PrintOpts): ModuleType | RecursiveTypes {
    const entries: RecursiveTypes = new Map([
      ...[...this.dirs].map(([name, dir]) => [name, dir.flatten(options)] as const),
      ...this.files,
    ]);

    if (!options.expand) {
      const types = new Set(entries.values());
      const [firstType] = types;
      if (types.size === 1 && typeof firstType === 'string') {
        return firstType;
      }
    }

    return entries;
  }

  print(options: PrintOpts) {
    const tree = this.flatten(options);

    if (typeof tree === 'string') {
      return `${this.path.join('/')}: ${tree}`;
    }

    const lines: string[] = [];
    const print = (prefix: string, types: RecursiveTypes) => {
      for (const [name, childTypes] of types) {
        if (typeof childTypes === 'string') {
          lines.push(`${prefix}${name}: ${childTypes}`);
        } else {
          lines.push(`${prefix}${name}/`);
          print(`  ${prefix}`, childTypes);
        }
      }
    };

    print('', tree);
    return lines.join('\n') + '\n';
  }

  toList() {
    const files: string[] = [];
    const getFiles = (tree: TypeTree) => {
      for (const dir of tree.dirs.values()) {
        getFiles(dir);
      }
      for (const filename of tree.files.keys()) {
        files.push([...tree.path, filename].join('/'));
      }
    };

    getFiles(this);

    return files.sort((a, b) => a.localeCompare(b));
  }
}
