/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import type { ArtifactSpec } from './artifact';

function isVersionFlag(a: string) {
  return a.startsWith('--version');
}

export function getCustomSnapshotUrl() {
  // force use of manually created snapshots until ReindexPutMappings fix
  if (
    !process.env.ES_SNAPSHOT_MANIFEST &&
    !process.env.KBN_ES_SNAPSHOT_URL &&
    !process.argv.some(isVersionFlag)
  ) {
    // return 'https://storage.googleapis.com/kibana-ci-tmp-artifacts/{name}-{version}-{os}-x86_64.{ext}';
    return;
  }

  if (process.env.KBN_ES_SNAPSHOT_URL && process.env.KBN_ES_SNAPSHOT_URL !== 'false') {
    return process.env.KBN_ES_SNAPSHOT_URL;
  }
}

export function resolveCustomSnapshotUrl(
  urlVersion: string,
  license: string
): ArtifactSpec | undefined {
  const customSnapshotUrl = getCustomSnapshotUrl();

  if (!customSnapshotUrl) {
    return;
  }

  const ext = process.platform === 'win32' ? 'zip' : 'tar.gz';
  const os = process.platform === 'win32' ? 'windows' : process.platform;
  const name = license === 'oss' ? 'elasticsearch-oss' : 'elasticsearch';
  const overrideUrl = customSnapshotUrl
    .replace('{name}', name)
    .replace('{ext}', ext)
    .replace('{os}', os)
    .replace('{version}', urlVersion);

  return {
    url: overrideUrl,
    checksumUrl: overrideUrl + '.sha512',
    checksumType: 'sha512',
    filename: Path.basename(overrideUrl),
  };
}
