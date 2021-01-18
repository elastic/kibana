const fs = require('fs');
const { execSync } = require('child_process');

const BASE_BUCKET_DAILY = 'kibana-ci-es-snapshots-daily-teamcity';
const BASE_BUCKET_PERMANENT = 'kibana-ci-es-snapshots-daily-teamcity/permanent';

(async () => {
  try {
    const MANIFEST_URL = process.argv[2];

    if (!MANIFEST_URL) {
      throw Error('Manifest URL missing');
    }

    if (!fs.existsSync('snapshot-promotion')) {
      fs.mkdirSync('snapshot-promotion');
    }
    process.chdir('snapshot-promotion');

    execSync(`curl '${MANIFEST_URL}' > manifest.json`);

    const manifest = JSON.parse(fs.readFileSync('manifest.json'));
    const { id, bucket, version } = manifest;

    console.log(`##teamcity[buildNumber '{build.number}-${version}-${id}']`);

    const manifestPermanent = {
      ...manifest,
      bucket: bucket.replace(BASE_BUCKET_DAILY, BASE_BUCKET_PERMANENT),
    };

    fs.writeFileSync('manifest-permanent.json', JSON.stringify(manifestPermanent, null, 2));

    execSync(
      `
      set -euo pipefail

      cp manifest.json manifest-latest-verified.json
      gsutil cp manifest-latest-verified.json gs://${BASE_BUCKET_DAILY}/${version}/

      rm manifest.json
      cp manifest-permanent.json manifest.json
      gsutil -m cp -r gs://${bucket}/* gs://${BASE_BUCKET_PERMANENT}/${version}/
      gsutil cp manifest.json gs://${BASE_BUCKET_PERMANENT}/${version}/

    `,
      { shell: '/bin/bash' }
    );
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
