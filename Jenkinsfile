#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

workers.base(bootstrapped: false, ramdisk: false, size: 's') {
  sh '.ci/packer_cache.sh'
}
