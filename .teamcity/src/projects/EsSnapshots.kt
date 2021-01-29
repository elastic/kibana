package projects

import builds.es_snapshots.*
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import templates.KibanaTemplate

object EsSnapshotsProject : Project({
  id("ES_Snapshots")
  name = "ES Snapshots"

  subProject {
    id("ES_Snapshot_Tests")
    name = "Tests"

    defaultTemplate = KibanaTemplate

    subProject {
      id("ES_Snapshot_Tests_OSS")
      name = "OSS Distro Tests"

      ossCloned.forEach {
        buildType(it)
      }

      buildType(OssTests)
    }

    subProject {
      id("ES_Snapshot_Tests_Default")
      name = "Default Distro Tests"

      defaultCloned.forEach {
        buildType(it)
      }

      buildType(DefaultTests)
    }

    subProject {
      id("ES_Snapshot_Tests_Integration")
      name = "Integration Tests"

      integrationCloned.forEach {
        buildType(it)
      }

      buildType(IntegrationTests)
    }
  }

  buildType(ESSnapshotBuild)
  buildType(ESSnapshotPromote)
  buildType(ESSnapshotPromoteImmediate)
  buildType(Verify)
})
