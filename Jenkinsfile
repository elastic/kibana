#!/bin/groovy
library 'kibana-pipeline-library'
kibanaLibrary.load()
kibanaPipeline(timeoutMinutes: 300) {
  slackNotifications.onFailure(disabled: true) {
    githubPr.withDefaultPrComments {
      ciStats.trackBuild {
        workers.ci(ramDisk: false, name: "package-build", size: 's') {
          withEnv(["GIT_COMMIT=${buildState.get('checkoutInfo').commit}"]) {
            withGcpServiceAccount.fromVaultSecret('secret/kibana-issues/dev/ci-artifacts-key', 'value') {
              kibanaPipeline.bash("test/scripts/jenkins_xpack_package_build.sh", "Build it")
            }
          }
        }
        def packageTypes = ['deb', 'docker', 'rpm']
        def workers = [:]
        packageTypes.each { type ->
          workers["package-${type}"] = {
            testPackage(type)
          }
        }
        parallel(workers)
      }
    }
  }
}
def testPackage(packageType) {
  workers.ci(ramDisk: false, name: "package-${packageType}", size: 's') {
    kibanaPipeline.bash("test/scripts/jenkins_xpack_package_${packageType}.sh", "Execute package testing for ${packageType}")
  }
}