/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ImportResolver } from '@kbn/import-resolver';
import type { ResolveResult } from '@kbn/import-resolver';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Rule } from 'eslint';
import { RUNNING_IN_EDITOR } from './helpers/running_in_editor';

let importResolverCache: ImportResolver | undefined;

/**
 * Several rules resolve every import of every file, so successful results are cached per resolver,
 * matching the resolver's own file system memo. Like that memo, misses are not cached, so a file
 * created later still resolves in long-lived processes.
 */
const createImportResolver = (): ImportResolver => {
  const resolver = ImportResolver.create(REPO_ROOT);
  const resolve = resolver.resolve.bind(resolver);
  const results = new Map<string, ResolveResult>();
  resolver.resolve = (req, dirname) => {
    const key = `${dirname}\0${req}`;
    const cached = results.get(key);
    if (cached) {
      return cached;
    }
    const result = resolve(req, dirname);
    if (result) {
      results.set(key, result);
    }
    return result;
  };
  return resolver;
};

/**
 * Create a request resolver for ESLint, requires a PluginPackageResolver from @kbn/repo-packages which will
 * be created and cached on contextServices automatically.
 *
 * All import requests in the repository should return a result, if they don't it's a bug
 * which should be caught by the `@kbn/import/no_unresolved` rule, which should never be disabled. If you need help
 * adding support for an import style please reach out to operations.
 */
export function getImportResolver(context: Rule.RuleContext): ImportResolver {
  if (RUNNING_IN_EDITOR) {
    return (context.parserServices.kibanaImportResolver ||= createImportResolver());
  }

  return (importResolverCache ||= createImportResolver());
}
