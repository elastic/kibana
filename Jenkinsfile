#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 135, checkPrChanges: true) {
  githubPr.withDefaultPrComments {
    catchError {
      retryable.enable()
      parallel([
        'kibana-xpack-agent': workers.functional('kibana-xpack-tests', { kibanaPipeline.buildXpack() }, [
          // 'xpack-firefoxSmoke': kibanaPipeline.functionalTestProcess('xpack-firefoxSmoke', './test/scripts/jenkins_xpack_firefox_smoke.sh'),
          'xpack-siemCypress': kibanaPipeline.functionalTestProcess('xpack-siemCypress', './test/scripts/jenkins_siem_cypress.sh'),
          // 'xpack-visualRegression': kibanaPipeline.functionalTestProcess('xpack-visualRegression', './test/scripts/jenkins_xpack_visual_regression.sh'),
        ]),
      ])
    }
  }

  retryable.printFlakyFailures()
  kibanaPipeline.sendMail()
}
