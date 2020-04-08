#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 135, checkPrChanges: true) {
  githubPr.withDefaultPrComments {
    catchError {
      parallel([
        'kibana-oss-agent': workers.functional('kibana-oss-tests', { kibanaPipeline.buildOss() }, [
          'oss-ciGroup1': kibanaPipeline.ossCiGroupProcess(1),
        ]),
        'kibana-xpack-agent': workers.functional('kibana-xpack-tests', { kibanaPipeline.buildXpack() }, [
          'xpack-ciGroup1': kibanaPipeline.xpackCiGroupProcess(1),
        ]),
      ])
    }
  }

  retryable.printFlakyFailures()
  kibanaPipeline.sendMail()
}
