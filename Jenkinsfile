#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

stage("Kibana Pipeline") { // This stage is just here to help the BlueOcean UI a little bit
  timeout(time: 180, unit: 'MINUTES') {
    timestamps {
      ansiColor('xterm') {
        catchError {
          parallel([
            'kibana-oss-agent': kibanaPipeline.withWorkers('kibana-oss-tests', { kibanaPipeline.buildOss() }, [
              'oss-visualRegression': kibanaPipeline.getPostBuildWorker('visualRegression', { runbld './test/scripts/jenkins_visual_regression.sh' }),
            ]),
            'kibana-xpack-agent': kibanaPipeline.withWorkers('kibana-xpack-tests', { kibanaPipeline.buildXpack() }, [
              'xpack-visualRegression': kibanaPipeline.getPostBuildWorker('xpack-visualRegression', { runbld './test/scripts/jenkins_xpack_visual_regression.sh' }),
            ]),
          ])
        }
        kibanaPipeline.sendMail()
      }
    }
  }
}