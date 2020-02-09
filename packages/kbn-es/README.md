# @kbn/es

> A command line utility for running elasticsearch from source or archive.

## Getting started
If running elasticsearch from source, elasticsearch needs to be cloned to a sibling directory of Kibana.

To run, go to the Kibana root and run `node scripts/es --help` to get the latest command line options.

### Examples

Run a snapshot install with a trial license
```
node scripts/es snapshot --license=trial
```

Run from source with a configured data directory
```
node scripts/es source --Epath.data=/home/me/es_data
```

## API

### run
Start a cluster
```
var es = require('@kbn/es');
es.run({
  license: 'basic',
  version: 7.0,
})
.catch(function (e) {
  console.error(e);
  process.exitCode = 1;
});
```

#### Options

##### options.license

Type: `String`

License type, one of: trial, basic, gold, platinum

##### options.version

Type: `String`

Desired elasticsearch version

##### options['source-path']

Type: `String`

Cloned location of elasticsearch repository, used when running from source

##### options['base-path']

Type: `String`

Location where snapshots are cached

## Snapshot Pinning

Sometimes we need to pin snapshots for a specific version. We'd really like to get this automated, but until that is completed here are the steps to take to build, upload, and switch to pinned snapshots for a branch.

To use these steps you'll need to setup the google-cloud-sdk, which can be installed on macOS with `brew cask install google-cloud-sdk`. Login with the CLI and you'll have access to the `gsutil` to do efficient/parallel uploads to GCS from the command line.

 1. Clone the elasticsearch repo somewhere
 2. Checkout the branch you want to build
 3. Run the following to delete old distributables

    ```
    find distribution/archives -type f \( -name 'elasticsearch-*-*.tar.gz' -o -name 'elasticsearch-*-*.zip' \) -not -path *no-jdk* -exec rm {} \;
    ```

 4. Build the new artifacts

    ```
    ./gradlew -p distribution/archives assemble --parallel
    ```

 4. Copy new artifacts to your `~/Downloads/tmp-artifacts`

    ```
    rm -rf ~/Downloads/tmp-artifacts
    mkdir ~/Downloads/tmp-artifacts
    find distribution/archives -type f \( -name 'elasticsearch-*-*.tar.gz' -o -name 'elasticsearch-*-*.zip' \) -not -path *no-jdk* -exec cp {} ~/Downloads/tmp-artifacts \;
    ```

 5. Calculate shasums of the uploads

    ```
    cd ~/Downloads/tmp-artifacts
    find * -exec bash -c "shasum -a 512 {} > {}.sha512" \;
    ```

 6. Check that the files in `~/Downloads/tmp-artifacts` look reasonable
 7. Upload the files to GCS

    ```
    gsutil -m rsync . gs://kibana-ci-tmp-artifacts/
    ```

 8. Once the artifacts are uploaded, modify `packages/kbn-es/src/custom_snapshots.js` in a PR to use a URL formatted like:

    ```
    // force use of manually created snapshots until ReindexPutMappings fix
    if (!process.env.KBN_ES_SNAPSHOT_URL && !process.argv.some(isVersionFlag)) {
      // return undefined;
      return 'https://storage.googleapis.com/kibana-ci-tmp-artifacts/{name}-{version}-{os}-x86_64.{ext}';
    }
    ```

    For 6.8, the format of the url should look like:

    ```
    'https://storage.googleapis.com/kibana-ci-tmp-artifacts/{name}-{version}.{ext}';
    ```