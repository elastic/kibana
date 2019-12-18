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
const AbortController = require('abort-controller');
const fetch = require('node-fetch');
const { basename } = require('path');

const { createCliError } = require('./errors');

function isVersionFlag(a) {
  return a.startsWith('--version');
}

function shouldUseUnverifiedSnapshot() {
  return !!process.env.KBN_ES_SNAPSHOT_USE_UNVERIFIED;
}

function getCustomSnapshotUrl() {
  // force use of manually created snapshots until ReindexPutMappings fix
  if (!process.env.KBN_ES_SNAPSHOT_URL && !process.argv.some(isVersionFlag)) {
    return;
    return 'https://storage.googleapis.com/kibana-ci-tmp-artifacts/{name}-{version}-{os}-x86_64.{ext}';
  }

  if (process.env.KBN_ES_SNAPSHOT_URL && process.env.KBN_ES_SNAPSHOT_URL !== 'false') {
    return process.env.KBN_ES_SNAPSHOT_URL;
  }
}

// TODO all of this stuff will probably move somewhere else
async function fetchSnapshotManifest(url) {
  const abc = new AbortController();
  const resp = await fetch(url, { signal: abc.signal });
  const json = await resp.text();

  return { abc, resp, json };
}

async function getSnapshotManifest(urlVersion, license) {
  const desiredVersion = urlVersion.replace('-SNAPSHOT', '');
  const desiredLicense = license === 'oss' ? 'oss' : 'default';

  const customManifestUrl = process.env.ES_SNAPSHOT_MANIFEST;
  const primaryManifestUrl = `https://storage.googleapis.com/kibana-ci-es-snapshots/${desiredVersion}/manifest-latest${
    shouldUseUnverifiedSnapshot() ? '' : '-verified'
  }.json`;
  const secondaryManifestUrl = `https://storage.googleapis.com/kibana-ci-es-snapshots-permanent/${desiredVersion}/manifest.json`;

  let { abc, resp, json } = await fetchSnapshotManifest(customManifestUrl || primaryManifestUrl);
  if (!customManifestUrl && !shouldUseUnverifiedSnapshot() && resp.status === 404) {
    ({ abc, resp, json } = await fetchSnapshotManifest(secondaryManifestUrl));
  }

  if (resp.status === 404) {
    abc.abort();
    throw createCliError(`Snapshots for ${desiredVersion} are not available`);
  }

  if (!resp.ok) {
    abc.abort();
    throw new Error(`Unable to read artifact info: ${resp.statusText}\n  ${json}`);
  }

  const manifest = JSON.parse(json);

  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const archive = manifest.archives.find(
    archive =>
      archive.version === desiredVersion &&
      archive.platform === platform &&
      archive.license === desiredLicense
  );

  return {
    url: archive.url,
    checksumUrl: archive.url + '.sha512',
    checksumType: 'sha512',
    filename: archive.filename,
  };
}

async function resolveCustomSnapshotUrl(urlVersion, license) {
  const customSnapshotUrl = getCustomSnapshotUrl();

  if (!customSnapshotUrl) {
    const manifest = getSnapshotManifest(urlVersion, license);
    if (manifest) {
      return manifest;
    }

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
