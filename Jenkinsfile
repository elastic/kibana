#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 150) {
  catchErrors {
    // retryable.enable(2)
    withEnv(["KBN_ES_SNAPSHOT_USE_UNVERIFIED=true"]) {
      parallel([
        'kibana-oss-agent': workers.functional('kibana-oss-tests', { kibanaPipeline.buildOss() }, [
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
        ]),
        'kibana-xpack-agent': workers.functional('kibana-xpack-tests', { kibanaPipeline.buildXpack() }, [
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
          'xpack-ciGroup11': kibanaPipeline.xpackCiGroupProcess(11),
        ]),
      ])
    }
  }
}
