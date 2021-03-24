#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 300) {
  slackNotifications.onFailure(disabled: true) {
    githubPr.withDefaultPrComments {
      ciStats.trackBuild {
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
  workers.ci(ramDisk: false, name: "package-${packageType}", size: 's-ubuntu') {
    runbld("test/scripts/jenkins_xpack_package_${packageType}.sh", "Execute package testing for ${packageType}")
  }
}
