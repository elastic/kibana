/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const GCS_ORIGIN = 'https://storage.googleapis.com';
const ES_CLOUD_IMAGE_REPOSITORY = 'docker.elastic.co/kibana-ci/elasticsearch-cloud-ess';
const DOCKER_TAG_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;

export function isAllowedArchiveUrl(url: string, bucket: string): boolean {
  if (isAllowedCloudImageRef(url)) {
    return true;
  }
  return isAllowedGcsObjectUrl(url, bucket);
}

export function isAllowedGcsObjectUrl(url: string, bucket: string): boolean {
  if (!isSafeBucketPath(bucket)) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.origin !== GCS_ORIGIN || parsed.username !== '' || parsed.password !== '') {
    return false;
  }

  const pathname = resolveDotSegments(parsed.pathname);
  return pathname.startsWith(`/${bucket}/`);
}

function isAllowedCloudImageRef(url: string): boolean {
  const separator = url.lastIndexOf(':');
  if (separator === -1) {
    return false;
  }

  const repository = url.slice(0, separator);
  const tag = url.slice(separator + 1);
  return repository === ES_CLOUD_IMAGE_REPOSITORY && DOCKER_TAG_PATTERN.test(tag);
}

function isSafeBucketPath(bucket: string): boolean {
  if (bucket.length === 0 || bucket.startsWith('/') || bucket.endsWith('/')) {
    return false;
  }
  const segments = bucket.split('/');
  return !segments.includes('..') && !segments.includes('.');
}

// URL parsing resolves ".." segments. Decode once more so "%2e%2e%2f" cannot leave the bucket.
function resolveDotSegments(pathname: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname).replaceAll('\\', '/');
  } catch {
    return '';
  }

  const segments: string[] = [];
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `/${segments.join('/')}`;
}
