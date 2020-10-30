#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 155, checkPrChanges: true) {
  githubPr.withDefaultPrComments {
    workers.base(name: 'packer-cache', size: 's', ramDisk: false, bootstrapped: false) {
      kibanaPipeline.bash('./.ci/packer_cache.sh', 'Execute packer_cache')

      kibanaPipeline.bash("""
        ./.ci/build_docker.sh
      """, "Testing bootstrap cache")
    }
  }
}
