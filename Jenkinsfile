#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 210, checkPrChanges: false, setCommitStatus: false) {
  kibanaPipeline.withCiTaskQueue([parallel: 2]) {
    catchErrors {
      tasks([
        kibanaPipeline.functionalTestProcess('oss-baseline', './test/scripts/jenkins_baseline.sh'),
        kibanaPipeline.scriptTask('Check Public API Docs', 'test/scripts/checks/plugin_public_api_docs.sh'),
      ])
    }
  }
}
