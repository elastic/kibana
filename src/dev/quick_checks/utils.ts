/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Convert milliseconds to a human-readable string
 */
export function humanizeTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms - minutes * 60 * 1000) / 1000);

  if (minutes === 0) {
    return `${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Extract just the check name from the full path
 * e.g., ".buildkite/scripts/steps/checks/ts_projects.sh" -> "ts_projects"
 */
export function getScriptShortName(script: string): string {
  const basename = script.split('/').pop() || script;
  return basename.replace('.sh', '');
}
