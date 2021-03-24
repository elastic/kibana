library 'kibana-pipeline-library'
kibanaLibrary.load()
kibanaLibrary.load()


kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true, setCommitStatus: true) {
kibanaPipeline(timeoutMinutes: 300) {
  slackNotifications.onFailure(disabled: !params.NOTIFY_ON_FAILURE) {
  slackNotifications.onFailure(disabled: true) {
    githubPr.withDefaultPrComments {
    githubPr.withDefaultPrComments {
      ciStats.trackBuild {
      ciStats.trackBuild {
        catchError {
        def packageTypes = ['deb', 'docker', 'rpm']
          retryable.enable()
        def workers = [:]
          kibanaPipeline.allCiTasks()
        packageTypes.each { type ->
          workers["package-${type}"] = {
            testPackage(type)
          }
        }
        }

        parallel(workers)
      }
      }
    }
    }
  }
  }
}


if (params.NOTIFY_ON_FAILURE) {
  def testPackage(packageType) {
      kibanaPipeline.sendMail()
      workers.ci(ramDisk: false, name: "package-${packageType}", size: 's') {
        runbld("test/scripts/jenkins_xpack_package_${packageType}.sh", "Execute package testing for ${packageType}")
      }
    }
  }
}