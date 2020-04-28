#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 135, checkPrChanges: true) {
  ciStats.trackBuild {
    githubPr.withDefaultPrComments {
      catchError {
        retryable.enable()
        parallel([
          'kibana-intake-agent': workers.intake('kibana-intake', './test/scripts/jenkins_unit.sh'),
          'x-pack-intake-agent': workers.intake('x-pack-intake', './test/scripts/jenkins_xpack.sh'),
          'kibana-oss-agent': workers.functional('kibana-oss-tests', { kibanaPipeline.buildOss() }, [
            'oss-firefoxSmoke': kibanaPipeline.functionalTestProcess('kibana-firefoxSmoke', './test/scripts/jenkins_firefox_smoke.sh'),
            'oss-ciGroup1': kibanaPipeline.ossCiGroupProcess(1),
            'oss-ciGroup2': kibanaPipeline.ossCiGroupProcess(2),
            'oss-ciGroup3': kibanaPipeline.ossCiGroupProcess(3),
            'oss-ciGroup4': kibanaPipeline.ossCiGroupProcess(4),
            'oss-ciGroup5': kibanaPipeline.ossCiGroupProcess(5),
            'oss-ciGroup6': kibanaPipeline.ossCiGroupProcess(6),
            'oss-ciGroup7': kibanaPipeline.ossCiGroupProcess(7),
            'oss-ciGroup8': kibanaPipeline.ossCiGroupProcess(8),
            'oss-ciGroup9': kibanaPipeline.ossCiGroupProcess(9),
            'oss-ciGroup10': kibanaPipeline.ossCiGroupProcess(10),
            'oss-ciGroup11': kibanaPipeline.ossCiGroupProcess(11),
            'oss-ciGroup12': kibanaPipeline.ossCiGroupProcess(12),
            'oss-accessibility': kibanaPipeline.functionalTestProcess('kibana-accessibility', './test/scripts/jenkins_accessibility.sh'),
            // 'oss-visualRegression': kibanaPipeline.functionalTestProcess('visualRegression', './test/scripts/jenkins_visual_regression.sh'),
          ]),
          'kibana-xpack-agent': workers.functional('kibana-xpack-tests', { kibanaPipeline.buildXpack() }, [
            'xpack-firefoxSmoke': kibanaPipeline.functionalTestProcess('xpack-firefoxSmoke', './test/scripts/jenkins_xpack_firefox_smoke.sh'),
            'xpack-ciGroup1': kibanaPipeline.xpackCiGroupProcess(1),
            'xpack-ciGroup2': kibanaPipeline.xpackCiGroupProcess(2),
            'xpack-ciGroup3': kibanaPipeline.xpackCiGroupProcess(3),
            'xpack-ciGroup4': kibanaPipeline.xpackCiGroupProcess(4),
            'xpack-ciGroup5': kibanaPipeline.xpackCiGroupProcess(5),
            'xpack-ciGroup6': kibanaPipeline.xpackCiGroupProcess(6),
            'xpack-ciGroup7': kibanaPipeline.xpackCiGroupProcess(7),
            'xpack-ciGroup8': kibanaPipeline.xpackCiGroupProcess(8),
            'xpack-ciGroup9': kibanaPipeline.xpackCiGroupProcess(9),
            'xpack-ciGroup10': kibanaPipeline.xpackCiGroupProcess(10),
            'xpack-accessibility': kibanaPipeline.functionalTestProcess('xpack-accessibility', './test/scripts/jenkins_xpack_accessibility.sh'),
            // 'xpack-visualRegression': kibanaPipeline.functionalTestProcess('xpack-visualRegression', './test/scripts/jenkins_xpack_visual_regression.sh'),
          ]),
        ])
      }

      retryable.printFlakyFailures()
      kibanaPipeline.sendMail()
    }
  }
}
