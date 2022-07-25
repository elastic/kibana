/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ImportResolver } from '@kbn/import-resolver';
import { REPO_ROOT } from '@kbn/utils';
import { Rule } from 'eslint';
import { RUNNING_IN_EDITOR } from './helpers/running_in_editor';

let importResolverCache: ImportResolver | undefined;

/**
 * Create a request resolver for ESLint, requires a PluginPackageResolver from @kbn/bazel-packages which will
 * be created and cached on contextServices automatically.
 *
 * All import requests in the repository should return a result, if they don't it's a bug
 * which should be caught by the `@kbn/import/no_unresolved` rule, which should never be disabled. If you need help
 * adding support for an import style please reach out to operations.
 */
export function getImportResolver(context: Rule.RuleContext): ImportResolver {
  if (RUNNING_IN_EDITOR) {
    return (context.parserServices.kibanaImportResolver ||= ImportResolver.create(REPO_ROOT));
  }

  return (importResolverCache ||= ImportResolver.create(REPO_ROOT));
}
