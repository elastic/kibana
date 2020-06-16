#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

workers.base(bootstrapped: false, ramdisk: false, size: 's') {
  sh '.ci/packer_cache.sh'
  sh 'ls -alh /var/lib/jenkins/.kibana/bootstrap_cache/'
  ws {
    checkout scm
    dir("kibana") {
      kibanaPipeline.doSetup()
    }
  }
}
