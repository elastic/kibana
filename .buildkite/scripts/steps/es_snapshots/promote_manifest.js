/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const { BASE_BUCKET_DAILY, BASE_BUCKET_PERMANENT } = require('./bucket_config.js');

(async () => {
  try {
    const MANIFEST_URL = process.argv[2];

    if (!MANIFEST_URL) {
      throw Error('Manifest URL missing');
    }

    const projectRoot = process.cwd();
    const tempDir = fs.mkdtempSync('snapshot-promotion');
    process.chdir(tempDir);

    execSync(`curl '${MANIFEST_URL}' > manifest.json`);

    const manifestJson = fs.readFileSync('manifest.json').toString();
    const manifest = JSON.parse(manifestJson);
    const { id, bucket, version } = manifest;

    const manifestPermanentJson = manifestJson
      .split(BASE_BUCKET_DAILY)
      .join(BASE_BUCKET_PERMANENT)
      .split(`${version}/archives/${id}`)
      .join(version); // e.g. replaceAll

    fs.writeFileSync('manifest-permanent.json', manifestPermanentJson);

    execSync(
      `
      set -euo pipefail
      cp manifest.json manifest-latest-verified.json
      ${projectRoot}/.buildkite/scripts/common/activate_service_account.sh ${BASE_BUCKET_DAILY}
      gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" cp manifest-latest-verified.json gs://${BASE_BUCKET_DAILY}/${version}/
      rm manifest.json
      cp manifest-permanent.json manifest.json
      ${projectRoot}/.buildkite/scripts/common/activate_service_account.sh ${BASE_BUCKET_PERMANENT}
      gsutil -m cp -r gs://${bucket}/* gs://${BASE_BUCKET_PERMANENT}/${version}/
      gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" cp manifest.json gs://${BASE_BUCKET_PERMANENT}/${version}/
    `,
      { shell: '/bin/bash' }
    );
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
