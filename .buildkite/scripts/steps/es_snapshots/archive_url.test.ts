/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAllowedArchiveUrl, isAllowedGcsObjectUrl } from './archive_url.ts';

const BUCKET = 'kibana-ci-es-snapshots-daily/9.6.0/archives/20260930-022144_09876e4a';
const OBJECT_URL = `https://storage.googleapis.com/${BUCKET}/elasticsearch-9.6.0-SNAPSHOT-linux-x86_64.tar.gz`;
const CLOUD_IMAGE =
  'docker.elastic.co/kibana-ci/elasticsearch-cloud-ess:9.6.0-SNAPSHOT-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('isAllowedArchiveUrl', () => {
  it('allows a snapshot object in the manifest bucket', () => {
    expect(isAllowedArchiveUrl(OBJECT_URL, BUCKET)).toBe(true);
  });

  it('allows the kibana-ci cloud image ref', () => {
    expect(isAllowedArchiveUrl(CLOUD_IMAGE, BUCKET)).toBe(true);
  });

  it('rejects dot-segment paths that resolve outside the bucket', () => {
    const traversed = `https://storage.googleapis.com/${BUCKET}/../../../../other-bucket/object`;
    expect(isAllowedArchiveUrl(traversed, BUCKET)).toBe(false);
  });

  it('rejects percent-encoded dot segments and slashes', () => {
    const encodedDots = `https://storage.googleapis.com/${BUCKET}/%2e%2e/%2e%2e/%2e%2e/%2e%2e/other-bucket/object`;
    const encodedSlashes = `https://storage.googleapis.com/${BUCKET}/%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fother-bucket/object`;
    expect(isAllowedArchiveUrl(encodedDots, BUCKET)).toBe(false);
    expect(isAllowedArchiveUrl(encodedSlashes, BUCKET)).toBe(false);
  });

  it('rejects a different host, scheme, or bucket prefix', () => {
    expect(isAllowedArchiveUrl(`https://evil.example/${BUCKET}/object`, BUCKET)).toBe(false);
    expect(isAllowedArchiveUrl(OBJECT_URL.replace('https://', 'http://'), BUCKET)).toBe(false);
    expect(
      isAllowedArchiveUrl(
        'https://storage.googleapis.com/kibana-ci-es-snapshots-daily-evil/object',
        'kibana-ci-es-snapshots-daily'
      )
    ).toBe(false);
  });

  it('rejects cloud image refs that are not a single tag on the expected repository', () => {
    expect(isAllowedArchiveUrl(`${CLOUD_IMAGE}/../../other`, BUCKET)).toBe(false);
    expect(
      isAllowedArchiveUrl('docker.elastic.co/kibana-ci/elasticsearch-cloud-ess:', BUCKET)
    ).toBe(false);
    expect(
      isAllowedArchiveUrl('docker.elastic.co/other/elasticsearch-cloud-ess:9.6.0', BUCKET)
    ).toBe(false);
  });
});

describe('isAllowedGcsObjectUrl', () => {
  it('allows a manifest object under the daily bucket', () => {
    expect(
      isAllowedGcsObjectUrl(
        'https://storage.googleapis.com/kibana-ci-es-snapshots-daily/9.6.0/archives/id/manifest.json',
        'kibana-ci-es-snapshots-daily'
      )
    ).toBe(true);
  });

  it('rejects credentials and dot segments in the bucket argument', () => {
    expect(
      isAllowedGcsObjectUrl(`https://user:pass@storage.googleapis.com/${BUCKET}/object`, BUCKET)
    ).toBe(false);
    expect(isAllowedGcsObjectUrl(OBJECT_URL, `${BUCKET}/../../other-bucket`)).toBe(false);
  });
});
