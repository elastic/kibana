#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 210, checkPrChanges: false, setCommitStatus: false) {
  parallel: [
    baseline: {
      workers.ci(
        name: 'baseline-worker',
        size: 'xl',
        ramDisk: true,
        runErrorReporter: false,
        bootstrapped: false
      ) {
        withGcpServiceAccount.fromVaultSecret('secret/kibana-issues/dev/ci-artifacts-key', 'value') {
          withEnv([
            'BUILD_TS_REFS_DISABLE=false', // disabled in root config so we need to override that here
            'BUILD_TS_REFS_CACHE_ENABLE=true',
            'BUILD_TS_REFS_CACHE_CAPTURE=true',
            'DISABLE_BOOTSTRAP_VALIDATION=true',
          ]) {
            kibanaPipeline.doSetup()
          }
        }
        kibanaPipeline.withCiTaskQueue([parallel: 2]) {
          catchErrors {
            tasks([
              kibanaPipeline.functionalTestProcess('oss-baseline', './test/scripts/jenkins_baseline.sh'),
              kibanaPipeline.scriptTask('Check Public API Docs', 'test/scripts/checks/plugin_public_api_docs.sh'),
            ])
          }
        }
      }
    },
    pr: {
      workers.ci(
        name: 'baseline-worker',
        size: 'xl',
        ramDisk: true,
        runErrorReporter: false,
        bootstrapped: true,
      ) {
        kibanaPipeline.withCiTaskQueue([parallel: 1]) {
          catchErrors {
            tasks([
              kibanaPipeline.scriptTask('Check Public API Docs', 'test/scripts/checks/plugin_public_api_docs.sh'),
            ])
          }
        }
      }
    }
  ]

}
