#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 120) {
  ciStats.trackBuild {
    catchError {
      parallel([
        'oss-visualRegression': {
          workers.ci(name: 'oss-visualRegression', size: 's', ramDisk: false) {
            kibanaPipeline.functionalTestProcess('oss-visualRegression', './test/scripts/jenkins_visual_regression.sh')(1)
          }
        },
        'xpack-visualRegression': {
          workers.ci(name: 'xpack-visualRegression', size: 's', ramDisk: false) {
            kibanaPipeline.functionalTestProcess('xpack-visualRegression', './test/scripts/jenkins_xpack_visual_regression.sh')(1)
          }
        },
      ])
    }

    kibanaPipeline.sendMail()
  }
}
