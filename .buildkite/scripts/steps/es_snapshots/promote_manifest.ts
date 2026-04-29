/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { execSync } from 'child_process';
import { BASE_BUCKET_DAILY, BASE_BUCKET_PERMANENT } from './bucket_config';

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
    const { id, bucket, version, sha } = manifest;
    if (!/^\d+\.\d+\.\d+(-SNAPSHOT)?$/.test(version)) {
      throw Error(`Invalid version format: ${version}`);
    }
    if (!/^[0-9a-f]{40}$/.test(sha)) {
      throw Error(`Invalid sha format: ${sha}`);
    }
    if (!/^[\w./-]+$/.test(id)) {
      throw Error(`Invalid id format: ${id}`);
    }
    if (!/^[\w./-]+$/.test(bucket)) {
      throw Error(`Invalid bucket format: ${bucket}`);
    }

    const manifestPermanentJson = manifestJson
      .split(BASE_BUCKET_DAILY)
      .join(BASE_BUCKET_PERMANENT)
      .split(`${version}/archives/${id}`)
      .join(version); // e.g. replaceAll

    fs.writeFileSync('manifest-permanent.json', manifestPermanentJson);

    execSync(
      `
      set -euo pipefail
      ${projectRoot}/.buildkite/scripts/common/activate_service_account.sh ${BASE_BUCKET_DAILY}
      cp manifest.json manifest-latest-verified.json
      gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" cp manifest-latest-verified.json gs://${BASE_BUCKET_DAILY}/${version}/
      rm manifest.json
      ${projectRoot}/.buildkite/scripts/common/activate_service_account.sh ${BASE_BUCKET_PERMANENT}
      cp manifest-permanent.json manifest.json
      gsutil -m cp -r gs://${bucket}/* gs://${BASE_BUCKET_PERMANENT}/${version}/
      gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" cp manifest.json gs://${BASE_BUCKET_PERMANENT}/${version}/
    `,
      { shell: '/bin/bash' }
    );

    const registry = 'docker.elastic.co/kibana-ci/elasticsearch';
    const sourceTag = `${version}-SNAPSHOT-${sha}`;
    const targetTag = `${version}-SNAPSHOT`;

    console.log(`Promoting docker image: ${registry}:${sourceTag} -> ${registry}:${targetTag}`);
    execSync(
      `docker buildx imagetools create -t ${registry}:${targetTag} ${registry}:${sourceTag}`,
      { stdio: 'inherit' }
    );
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
