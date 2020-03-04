#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 120) {
  catchError {
    parallel([
      workers.base(name: 'oss-visualRegression', label: 'linux && immutable') {
        kibanaPipeline.buildOss()
        kibanaPipeline.functionalTestProcess('oss-visualRegression', './test/scripts/jenkins_visual_regression.sh')
      },
      workers.base(name: 'xpack-visualRegression', label: 'linux && immutable') {
        kibanaPipeline.buildXpack()
        kibanaPipeline.functionalTestProcess('xpack-visualRegression', './test/scripts/jenkins_xpack_visual_regression.sh')
      },
    ])
  }

  kibanaPipeline.sendMail()
}
