const fs = require('fs');
const { execSync } = require('child_process');

(async () => {
  const destination = process.argv[2] || __dirname + '/test';

  let ES_BRANCH = 'TODO';
  let GIT_COMMIT = 'TODO';
  let GIT_COMMIT_SHORT = 'TODO';

  let VERSION = '';
  let SNAPSHOT_ID = '';
  let DESTINATION = '';

  const now = new Date()

  // format: yyyyMMdd-HHmmss
  const date = [
    now.getFullYear(),
    (now.getMonth()+1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0'),
    '-',
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
  ].join('')

  try {
    const files = fs.readdirSync(destination);
    const manifestEntries = files
      .filter(f => !f.match(/.sha512$/))
      .filter(f => !f.match(/.json$/))
      .map(filename => {
        const parts = filename.replace("elasticsearch-oss", "oss").split("-")

        VERSION = VERSION || parts[1];
        SNAPSHOT_ID = SNAPSHOT_ID || `${date}_${GIT_COMMIT_SHORT}`;
        DESTINATION = DESTINATION || `${VERSION}/archives/${SNAPSHOT_ID}`;

        return {
          filename: filename,
          checksum: filename + '.sha512',
          url: `https://storage.googleapis.com/kibana-ci-es-snapshots-daily-teamcity/${DESTINATION}/${filename}`,
          version: parts[1],
          platform: parts[3],
          architecture: parts[4].split('.')[0],
          license: parts[0] == 'oss' ? 'oss' : 'default',
        }
      });

    const manifest = {
      bucket: `kibana-ci-es-snapshots-daily-teamcity/${DESTINATION}`.toString(),
      branch: ES_BRANCH,
      sha: GIT_COMMIT,
      sha_short: GIT_COMMIT_SHORT,
      version: VERSION,
      generated: now.toISOString(),
      archives: manifestEntries,
    };

    const manifestJSON = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(`${destination}/manifest.json`, manifestJSON);

    execSync(`
      set -euo pipefail
      cd "${destination}"
      gsutil -m cp -r *.* gs://kibana-ci-es-snapshots-daily-teamcity/${DESTINATION}
      cp manifest.json manifest-latest.json
      gsutil cp manifest-latest.json gs://kibana-ci-es-snapshots-daily-teamcity/${VERSION}
      tc_set_env ES_SNAPSHOT_MANIFEST 'https://storage.googleapis.com/kibana-ci-es-snapshots-daily-teamcity/${DESTINATION}/manifest.json'
    `, { shell: '/bin/bash' });
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
