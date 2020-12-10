package builds.es_snapshots

import builds.default.DefaultBuild
import builds.default.DefaultSecuritySolution
import builds.default.defaultCiGroups
import builds.oss.OssBuild
import builds.oss.OssPluginFunctional
import builds.oss.ossCiGroups
import builds.test.ApiServerIntegration
import builds.test.JestIntegration
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.*

val cloneForVerify = { build: BuildType ->
  val newBuild = BuildType()
  build.copyTo(newBuild)
  newBuild.id = AbsoluteId(build.id?.toString() + "_ES_Snapshots")
  newBuild.params {
    param("env.ES_SNAPSHOT_MANIFEST", "${ESSnapshotBuild.depParamRefs["env.ES_SNAPSHOT_MANIFEST"]}")
  }
  newBuild.dependencies {
    dependency(ESSnapshotBuild) {
      snapshot {
        onDependencyFailure = FailureAction.FAIL_TO_START
        onDependencyCancel = FailureAction.FAIL_TO_START
      }
      // This is just here to allow us to select a build when manually triggering a build using the UI
      artifacts {
        artifactRules = "manifest.json"
      }
    }
  }
  newBuild.steps.items.removeIf { it.name == "Failed Test Reporter" }
  newBuild
}

val ossBuildsToClone = listOf(
  *ossCiGroups.toTypedArray(),
  OssPluginFunctional
)

val ossCloned = ossBuildsToClone.map { cloneForVerify(it) }

val defaultBuildsToClone = listOf(
  *defaultCiGroups.toTypedArray(),
  DefaultSecuritySolution
)

val defaultCloned = defaultBuildsToClone.map { cloneForVerify(it) }

val integrationsBuildsToClone = listOf(
  ApiServerIntegration,
  JestIntegration
)

val integrationCloned = integrationsBuildsToClone.map { cloneForVerify(it) }

object OssTests : BuildType({
  id("ES_Snapshots_OSS_Tests_Composite")
  name = "OSS Distro Tests"
  type = Type.COMPOSITE

  dependsOn(*ossCloned.toTypedArray())
})

object DefaultTests : BuildType({
  id("ES_Snapshots_Default_Tests_Composite")
  name = "Default Distro Tests"
  type = Type.COMPOSITE

  dependsOn(*defaultCloned.toTypedArray())
})

object IntegrationTests : BuildType({
  id("ES_Snapshots_Integration_Tests_Composite")
  name = "Integration Tests"
  type = Type.COMPOSITE

  dependsOn(*integrationCloned.toTypedArray())
})

object Verify : BuildType({
  id("ES_Snapshots_Verify_Composite")
  name = "Verify Snapshot"
  description = "Run all Kibana functional and integration tests using a given Elasticsearch snapshot"
  type = Type.COMPOSITE

  dependsOn(
    ESSnapshotBuild,
    OssBuild,
    DefaultBuild,
    OssTests,
    DefaultTests,
    IntegrationTests
  )
})
