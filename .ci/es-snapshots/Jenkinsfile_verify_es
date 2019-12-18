#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

// TODO finalize these
def SNAPSHOT_VERSION = params.SNAPSHOT_VERSION ?: "8.0.0"
def SNAPSHOT_ID = params.SNAPSHOT_ID ?: "20191216-202229_c1d075a7dab"

def ES_OSS_SNAPSHOT = "https://storage.googleapis.com/kibana-ci-es-snapshots/${SNAPSHOT_VERSION}/archives/${SNAPSHOT_ID}/elasticsearch-oss-${SNAPSHOT_VERSION}-SNAPSHOT-linux-x86_64.tar.gz"
def ES_XPACK_SNAPSHOT = "https://storage.googleapis.com/kibana-ci-es-snapshots/${SNAPSHOT_VERSION}/archives/${SNAPSHOT_ID}/elasticsearch-${SNAPSHOT_VERSION}-SNAPSHOT-linux-x86_64.tar.gz"

timeout(time: 120, unit: 'MINUTES') {
  timestamps {
    ansiColor('xterm') {
      catchError {
        parallel([
          oss: {
            withEnv(["KBN_ES_SNAPSHOT_URL=${ES_OSS_SNAPSHOT}"]) {
              parallel([
                'kibana-intake-agent': kibanaPipeline.legacyJobRunner('kibana-intake'), // TODO we just need to run integration tests from intake?
                'kibana-oss-agent': kibanaPipeline.withWorkers('kibana-oss-tests', { kibanaPipeline.buildOss() }, [
                  'oss-ciGroup1': kibanaPipeline.getOssCiGroupWorker(1),
                  'oss-ciGroup2': kibanaPipeline.getOssCiGroupWorker(2),
                  'oss-ciGroup3': kibanaPipeline.getOssCiGroupWorker(3),
                  'oss-ciGroup4': kibanaPipeline.getOssCiGroupWorker(4),
                  'oss-ciGroup5': kibanaPipeline.getOssCiGroupWorker(5),
                  'oss-ciGroup6': kibanaPipeline.getOssCiGroupWorker(6),
                  'oss-ciGroup7': kibanaPipeline.getOssCiGroupWorker(7),
                  'oss-ciGroup8': kibanaPipeline.getOssCiGroupWorker(8),
                  'oss-ciGroup9': kibanaPipeline.getOssCiGroupWorker(9),
                  'oss-ciGroup10': kibanaPipeline.getOssCiGroupWorker(10),
                  'oss-ciGroup11': kibanaPipeline.getOssCiGroupWorker(11),
                  'oss-ciGroup12': kibanaPipeline.getOssCiGroupWorker(12),
                ]),
              ])
            }
          },
          xpack: {
            withEnv(["KBN_ES_SNAPSHOT_URL=${ES_XPACK_SNAPSHOT}"]) {
              parallel([
                'x-pack-intake-agent': kibanaPipeline.legacyJobRunner('x-pack-intake'), // TODO we just need to run integration tests from intake?
                'kibana-xpack-agent': kibanaPipeline.withWorkers('kibana-xpack-tests', { kibanaPipeline.buildXpack() }, [
                  'xpack-ciGroup1': kibanaPipeline.getXpackCiGroupWorker(1),
                  'xpack-ciGroup2': kibanaPipeline.getXpackCiGroupWorker(2),
                  'xpack-ciGroup3': kibanaPipeline.getXpackCiGroupWorker(3),
                  'xpack-ciGroup4': kibanaPipeline.getXpackCiGroupWorker(4),
                  'xpack-ciGroup5': kibanaPipeline.getXpackCiGroupWorker(5),
                  'xpack-ciGroup6': kibanaPipeline.getXpackCiGroupWorker(6),
                  'xpack-ciGroup7': kibanaPipeline.getXpackCiGroupWorker(7),
                  'xpack-ciGroup8': kibanaPipeline.getXpackCiGroupWorker(8),
                  'xpack-ciGroup9': kibanaPipeline.getXpackCiGroupWorker(9),
                  'xpack-ciGroup10': kibanaPipeline.getXpackCiGroupWorker(10),
                ]),
              ])
            }
          }
        ])

        promoteSnapshot(SNAPSHOT_VERSION, SNAPSHOT_ID)
      }

      kibanaPipeline.sendMail()
    }
  }
}

def promoteSnapshot(snapshotVersion, snapshotId) {
  node('linux && immutable') {
    esSnapshots.promote(snapshotVersion, snapshotId)
  }
}
