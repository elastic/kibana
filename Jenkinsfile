#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 180) {
  catchError {
    workers.base(size: 's', ramDisk: false) {
      kibanaPipeline.bash('test/scripts/jenkins_security_solution_e2e.sh', 'Execute Security Solution E2E')
    }
  }

  // if (params.NOTIFY_ON_FAILURE) {
  if (true) {
    slackNotifications.onFailure(channel: '@Glo')
    kibanaPipeline.sendMail(to: 'gloria.delatorre@elastic.co')
  }
}
