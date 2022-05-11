/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const { BASE_BUCKET_DAILY } = require('./bucket_config');

(async () => {
  console.log('--- Create ES Snapshot Manifest');

  const destination = process.argv[2] || __dirname + '/test';

  const ES_BRANCH = process.env.ELASTICSEARCH_BRANCH;
  const ES_CLOUD_IMAGE = process.env.ELASTICSEARCH_CLOUD_IMAGE;
  const ES_CLOUD_IMAGE_CHECKSUM = process.env.ELASTICSEARCH_CLOUD_IMAGE_CHECKSUM;
  const GIT_COMMIT = process.env.ELASTICSEARCH_GIT_COMMIT;
  const GIT_COMMIT_SHORT = process.env.ELASTICSEARCH_GIT_COMMIT_SHORT;

  let VERSION = '';
  let SNAPSHOT_ID = '';
  let DESTINATION = '';

  const now = new Date();

  // format: yyyyMMdd-HHmmss
  const date = [
    now.getFullYear(),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0'),
    '-',
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
  ].join('');

  try {
    const files = fs.readdirSync(destination);
    const manifestEntries = files
      .filter((filename) => !filename.match(/.sha512$/))
      .filter((filename) => !filename.match(/.json$/))
      .map((filename) => {
        const parts = filename.replace('elasticsearch-oss', 'oss').split('-');

        VERSION = VERSION || parts[1];
        SNAPSHOT_ID = SNAPSHOT_ID || `${date}_${GIT_COMMIT_SHORT}`;
        DESTINATION = DESTINATION || `${VERSION}/archives/${SNAPSHOT_ID}`;

        return {
          filename: filename,
          checksum: filename + '.sha512',
          url: `https://storage.googleapis.com/${BASE_BUCKET_DAILY}/${DESTINATION}/${filename}`,
          version: parts[1],
          platform: parts[3],
          architecture: parts[4].split('.')[0],
          license: parts[0] === 'oss' ? 'oss' : 'default',
        };
      });

    if (ES_CLOUD_IMAGE && ES_CLOUD_IMAGE_CHECKSUM) {
      manifestEntries.push({
        checksum: ES_CLOUD_IMAGE_CHECKSUM,
        url: ES_CLOUD_IMAGE,
        version: VERSION,
        platform: 'docker',
        architecture: 'image',
        license: 'default',
      });
    }

    const manifest = {
      id: SNAPSHOT_ID,
      bucket: `${BASE_BUCKET_DAILY}/${DESTINATION}`.toString(),
      branch: ES_BRANCH,
      sha: GIT_COMMIT,
      sha_short: GIT_COMMIT_SHORT,
      version: VERSION,
      generated: now.toISOString(),
      archives: manifestEntries,
    };

    const manifestJSON = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(`${destination}/manifest.json`, manifestJSON);

    console.log('Manifest:', manifestJSON);

    execSync(
      `
      set -euo pipefail

      echo '--- Upload files to GCS'
      cd "${destination}"
      gsutil -m cp -r *.* gs://${BASE_BUCKET_DAILY}/${DESTINATION}
      cp manifest.json manifest-latest.json
      gsutil cp manifest-latest.json gs://${BASE_BUCKET_DAILY}/${VERSION}

      buildkite-agent meta-data set ES_SNAPSHOT_MANIFEST 'https://storage.googleapis.com/${BASE_BUCKET_DAILY}/${DESTINATION}/manifest.json'
      buildkite-agent meta-data set ES_SNAPSHOT_VERSION '${VERSION}'
      buildkite-agent meta-data set ES_SNAPSHOT_ID '${SNAPSHOT_ID}'
    `,
      { shell: '/bin/bash' }
    );
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
