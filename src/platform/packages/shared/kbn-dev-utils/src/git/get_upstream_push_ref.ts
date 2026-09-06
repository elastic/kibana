/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';

export interface UpstreamPushRef {
  base: string;
  baseRef: string;
}

const tryResolveRef = async (ref: string): Promise<UpstreamPushRef | null> => {
  const execa = (await import('execa')).default;
  try {
    const { stdout: sha } = await execa('git', ['rev-parse', ref], {
      cwd: REPO_ROOT,
      reject: true,
    });
    const base = sha.trim();
    if (!base) return null;

    const { stdout: symbolic } = await execa('git', ['rev-parse', '--abbrev-ref', ref], {
      cwd: REPO_ROOT,
      reject: false,
    });
    return { base, baseRef: symbolic.trim() || ref };
  } catch {
    return null;
  }
};

/**
 * Resolves the remote tracking ref for the current branch that would be the
 * target of a `git push`. Tries `@{push}` first (honors pushDefault config),
 * then falls back to `@{upstream}`. Returns null when no tracking branch is
 * configured.
 */
export const getUpstreamPushRef = async (): Promise<UpstreamPushRef | null> => {
  return (await tryResolveRef('@{push}')) ?? (await tryResolveRef('@{upstream}'));
};
