/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { basename } = require('path');

function isVersionFlag(a) {
  return a.startsWith('--version');
}

function getCustomSnapshotUrl() {
  if (
    !process.env.ES_SNAPSHOT_MANIFEST &&
    !process.env.KBN_ES_SNAPSHOT_URL &&
    !process.argv.some(isVersionFlag)
  ) {
    // return 'https://storage.googleapis.com/kibana-ci-tmp-artifacts/{name}-{version}-{os}-x86_64.{ext}';
    return undefined;
  }

  if (process.env.KBN_ES_SNAPSHOT_URL && process.env.KBN_ES_SNAPSHOT_URL !== 'false') {
    return process.env.KBN_ES_SNAPSHOT_URL;
  }
}

function resolveCustomSnapshotUrl(urlVersion, license) {
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
    filename: basename(overrideUrl),
  };
}

module.exports = { getCustomSnapshotUrl, resolveCustomSnapshotUrl };
