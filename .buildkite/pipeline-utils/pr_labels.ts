/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum FIPS_VERSION {
  TWO = '140-2',
  THREE = '140-3',
}

export const FIPS_GH_LABELS = {
  [FIPS_VERSION.TWO]: 'ci:enable-fips-140-2-agent',
  [FIPS_VERSION.THREE]: 'ci:enable-fips-140-3-agent',
};

/**
 * Checks if the PR has a specific FIPS label or ANY FIPS label when no version is passed.
 */
export function prHasFIPSLabel(version?: FIPS_VERSION): boolean {
  const labels = process.env.GITHUB_PR_LABELS ?? '';

  if (!labels) {
    return false;
  }

  if (version) {
    return labels.includes(FIPS_GH_LABELS[version]);
  }

  return Object.values(FIPS_GH_LABELS).some((label) => labels.includes(label));
}

/**
 * Available auto-mapped label options, respected by 'collectEnvFromLabels' function.
 */
export const LABEL_MAPPING: Record<string, Record<string, string>> = {
  'ci:use-chrome-beta': {
    USE_CHROME_BETA: 'true', // Use if you want to run tests with Chrome Beta
  },
  [FIPS_GH_LABELS[FIPS_VERSION.TWO]]: {
    TEST_ENABLE_FIPS_VERSION: FIPS_VERSION.TWO,
  },
  [FIPS_GH_LABELS[FIPS_VERSION.THREE]]: {
    TEST_ENABLE_FIPS_VERSION: FIPS_VERSION.THREE,
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
