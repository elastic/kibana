/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import Resolve from 'resolve';
import { REPO_ROOT } from '@kbn/utils';

import { isDirectory, isFile } from './helpers/fs';
import { ResolveResult } from './resolve_result';

const NODE_MODULE_SEG = Path.sep + 'node_modules' + Path.sep;

function packageFilter(pkg: Record<string, unknown>) {
  if (!pkg.main && pkg.types) {
    // for the purpose of resolving files, a "types" file is adequate
    return {
      ...pkg,
      main: pkg.types,
    };
  }

  return pkg;
}

function adaptReq(req: string, dirname: string): string | undefined {
  // transform webpack loader requests and focus on the actual file selected
  if (req.startsWith('!!')) {
    return req.split('!').pop()?.split('?').shift();
  }

  // handle typescript aliases
  if (req === 'kibana/public') {
    return adaptReq('src/core/public', dirname);
  }

  if (req === 'kibana/server') {
    return adaptReq('src/core/server', dirname);
  }

  // turn root-relative paths into relative paths
  if (
    req.startsWith('src/') ||
    req.startsWith('x-pack/') ||
    req.startsWith('examples/') ||
    req.startsWith('test/')
  ) {
    const absolute = Path.resolve(REPO_ROOT, req);
    return `./${Path.relative(dirname, absolute)}`;
  }
}

function shouldResolve(req: string) {
  // this library is only installed on CI and never resolvable
  if (req === 'kibana-buildkite-library') {
    return;
  }

  // these are special webpack-aliases only used in storybooks, ignore them
  if (req === 'core_styles' || req === 'core_app_image_assets') {
    return;
  }

  // ignore amd require done by ace syntax plugin
  if (req === 'ace/lib/dom') {
    return;
  }

  // ignore requests to grammar/built_grammar.js files or built kbn-monaco workers, these are built by bazel and never resolvable
  if (
    req.endsWith('grammar/built_grammar.js') ||
    (req.includes('/target_workers/') && req.endsWith('.editor.worker.js'))
  ) {
    return;
  }

  // typescript validates these imports fine and they're purely virtual thanks to ambient type definitions in @elastic/eui so /shrug
  if (
    req.startsWith('@elastic/eui/src/components/') ||
    req.startsWith('@elastic/eui/src/services/')
  ) {
    return;
  }

  return true;
}

function tryNodeResolve(req: string, dirname: string): ResolveResult | null {
  try {
    const path = Resolve.sync(req, {
      basedir: dirname,
      extensions: ['.js', '.json', '.ts', '.tsx', '.d.ts'],
      isDirectory,
      isFile,
      packageFilter,
    });

    if (path.includes(NODE_MODULE_SEG)) {
      const modulePath = path.split(NODE_MODULE_SEG).pop()!.split(Path.sep);
      const moduleId = modulePath[0].startsWith('@')
        ? `${modulePath[0]}/${modulePath[1]}`
        : modulePath[0];
      return {
        type: 'file',
        absolute: path,
        nodeModule: moduleId,
      };
    }

    return {
      type: 'file',
      absolute: path.includes('node_modules') ? Fs.readlinkSync(path) : path,
    };
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw error;
  }
}

function tryTypesResolve(req: string, dirname: string): ResolveResult | null {
  const parts = req.split('/');
  const nmParts = parts[0].startsWith('@') ? [parts[0].slice(1), parts[1]] : [parts[0]];
  const typesReq = `@types/${nmParts.join('__')}`;
  const result = tryNodeResolve(typesReq, dirname);

  if (result) {
    return {
      type: '@types',
      module: typesReq,
    };
  }

  return null;
}

/**
 * Resolve an import request. All import requests in the repository should return a result, if they don't it's a bug
 * which should be caught by the `@kbn/import/no_unresolved` rule, which should never be disabled. If you need help
 * adding support for an import style please reach out to operations.
 *
 * @param req Text from an import/require, like `../../src/core/public` or `@kbn/std`
 * @param dirname The directory of the file where the req was found
 */
export function resolveKibanaImport(req: string, dirname: string): ResolveResult | null {
  req = adaptReq(req, dirname) ?? req;

  if (!shouldResolve(req)) {
    return { type: 'ignore' };
  }

  return tryNodeResolve(req, dirname) ?? tryTypesResolve(req, dirname);
}
