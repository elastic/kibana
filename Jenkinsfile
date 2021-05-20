#!/bin/groovy

library 'kibana-pipeline-library@gcloud-fix-parallel'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 210, checkPrChanges: true, setCommitStatus: true) {
  node('flyweight') {
    parallel([
      one: {
        withGcpServiceAccount.fromVaultSecret('secret/kibana-issues/dev/ci-artifacts-key', 'value') {
          kibanaPipeline.bash("""
            sleep 5
            gcloud auth list
            gsutil ls gs://ci-artifacts.kibana.dev/
          """, "Test 1")
        }
      },
      two: {
        withGcpServiceAccount.fromVaultSecret('secret/kibana-issues/dev/ci-artifacts-key', 'value') {
          kibanaPipeline.bash("""
            gcloud auth list
            gsutil ls gs://ci-artifacts.kibana.dev/
          """, "Test 2")
        }
      }
    ])
  }
}
