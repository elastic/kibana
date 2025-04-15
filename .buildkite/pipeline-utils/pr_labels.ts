/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Available auto-mapped label options, respected by 'collectEnvFromLabels' function.
 */
export const LABEL_MAPPING: Record<string, Record<string, string>> = {
  'ci:use-chrome-beta': {
    USE_CHROME_BETA: 'true', // Use if you want to run tests with Chrome Beta
  },
};

/**
 * This function reads available GITHUB_LABELS and maps them to environment variables.
 */
export function collectEnvFromLabels(
  labels = process.env.GITHUB_PR_LABELS
): Record<string, string> {
  const envFromlabels: Record<string, string> = {};

  if (labels) {
    const labelArray = labels.split(',');
    labelArray.forEach((label) => {
      const env = LABEL_MAPPING[label];
      if (env) {
        Object.assign(envFromlabels, env);
      }
    });
  }

  return envFromlabels;
}
