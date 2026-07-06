/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';

export interface CompatibilityIssue {
  path: string;
  message: string;
  ruleId?: string;
}

interface RedoclyProblemLocation {
  pointer?: string;
}

interface RedoclyProblem {
  location?: RedoclyProblemLocation[];
  message: string;
  ruleId?: string;
  severity?: string;
}

interface RedoclyLintOutput {
  problems?: RedoclyProblem[];
}

const redoclyCompatibilityConfigRelativePath =
  'src/platform/packages/private/kbn-validate-oas/redocly_compatibility_linter/config.yaml';

export const normalizeRedoclyPointer = (pointer?: string) => {
  if (!pointer) {
    return '';
  }

  return pointer.startsWith('#') ? pointer.slice(1) : pointer;
};

export const parseRedoclyCompatibilityIssues = (stdout: string): CompatibilityIssue[] => {
  const { problems = [] } = JSON.parse(stdout) as RedoclyLintOutput;

  return problems
    .filter(({ severity }) => severity === 'error')
    .map(({ location, message, ruleId }) => ({
      path: normalizeRedoclyPointer(location?.[0]?.pointer),
      message,
      ruleId,
    }));
};

export const validateCompatibility = async (relativePathToYaml: string) => {
  try {
    const result = await execa(
      './node_modules/.bin/redocly',
      [
        'lint',
        relativePathToYaml,
        `--config=${redoclyCompatibilityConfigRelativePath}`,
        '--format=json',
        '--max-problems=10000',
      ],
      {
        cwd: REPO_ROOT,
        reject: false,
      }
    );

    const issues = parseRedoclyCompatibilityIssues(result.stdout);

    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      valid: false,
      issues: [
        {
          path: '',
          message: `Failed to run Redocly compatibility validation: ${message}`,
        },
      ],
    };
  }
};
