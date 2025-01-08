/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import memoize from 'lodash/memoize';

export const extractImageInfo = memoize(async (image: string) => {
  try {
    const { stdout: labelsJson } = await execa(
      'docker',
      ['inspect', '--format', '{{json .Config.Labels}}', image],
      {
        encoding: 'utf8',
      }
    );
    return JSON.parse(labelsJson);
  } catch (e) {
    return {};
  }
});

export async function getImageVersion(image: string): Promise<string | null> {
  const imageLabels = await extractImageInfo(image);
  return imageLabels['org.opencontainers.image.revision'] || null;
}

export async function getCommitUrl(image: string): Promise<string | null> {
  const imageLabels = await extractImageInfo(image);
  const repoSource = imageLabels['org.opencontainers.image.source'] || null;
  const revision = imageLabels['org.opencontainers.image.revision'] || null;

  if (!repoSource || !revision) {
    return null;
  } else {
    return `${repoSource}/commit/${revision}`;
  }
}

export async function getServerlessImageTag(image: string): Promise<string | null> {
  const sha = await getImageVersion(image);
  if (!sha) {
    return null;
  } else {
    return `git-${sha.slice(0, 12)}`;
  }
}
