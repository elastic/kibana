#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true) {
  githubPr.withDefaultPrComments {
    workers.base(name: 'packer-cache', size: 's', ramDisk: false, bootstrapped: false) {
      kibanaPipeline.bash('./.ci/packer_cache.sh', 'Execute packer_cache')

      kibanaPipeline.bash("""
        source src/dev/ci_setup/setup.sh

        mkdir cache-test
        cd cache-test

        tar -xf "$HOME/.kibana/bootstrap_cache/master.tar"
        ls -alh .
        ls -alh node_modules
        ls -alh x-pack/node_modules
      """, "Testing bootstrap cache")
    }
  }
}
