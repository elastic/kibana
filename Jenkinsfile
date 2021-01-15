#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 150) {
  retryable.enable(1)
  parallel([
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
      'xpack-ciGroup12': kibanaPipeline.xpackCiGroupProcess(12),
      'xpack-ciGroup13': kibanaPipeline.xpackCiGroupProcess(13),
    ]),
  ])
}
