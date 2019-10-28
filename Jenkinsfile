#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

stage("Kibana Pipeline") { // This stage is just here to help the BlueOcean UI a little bit
  timeout(time: 180, unit: 'MINUTES') {
    timestamps {
      ansiColor('xterm') {
        catchError {
          parallel([

            'kibana-oss-agent2': withWorkers('kibana-oss-tests2', { buildOss() }, [
              'oss-visualRegression': getPostBuildWorker('visualRegression', { runbld './test/scripts/jenkins_visual_regression.sh' }),
            ]),
            'kibana-xpack-agent2': withWorkers('kibana-xpack-tests2', { buildXpack() }, [
              'xpack-visualRegression': getPostBuildWorker('xpack-visualRegression', { runbld './test/scripts/jenkins_xpack_visual_regression.sh' }),
            ]),
          ])
        }
        kibanaPipeline.sendMail()
      }
    }
  }
}
