#!/bin/groovy

if (!env.ghprbPullId) {
  print "Non-PR builds are now in Buildkite."
  return
}

library 'kibana-pipeline-library'
kibanaLibrary.load()

kibanaPipeline(timeoutMinutes: 300, checkPrChanges: false, setCommitStatus: false) {
  workers.ci(name: "test-x", size: 'n2-standard-16', ramDisk: true) {
    kibanaPipeline.buildPlugins()
    kibanaPipeline.buildKibana()
  }

  def tasks = [:]
  for(def i = 1; i <= 20; i++) {
    def j = i
    tasks["worker-${j}"] = {
      workers.ci(name: "test-${i}", size: 'ci-group-6', ramDisk: true) {
        kibanaPipeline.downloadDefaultBuildArtifacts()
        kibanaPipeline.bash("""
          cd '${env.WORKSPACE}'
          mkdir -p kibana-build
          tar -xzf kibana-default.tar.gz -C kibana-build --strip=1
          tar -xzf kibana-default-plugins.tar.gz -C kibana
        """, "Extract Default Build artifacts")
        kibanaPipeline.xpackCiGroupProcess('10', false)()
      }
    }
  }

  parallel(tasks)
}
