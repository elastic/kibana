package builds.es_snapshots

import builds.default.DefaultBuild
import builds.default.DefaultSecuritySolution
import builds.default.defaultCiGroups
import builds.oss.OssBuild
import builds.oss.OssPluginFunctional
import builds.oss.ossCiGroups
import builds.test.ApiIntegration
import builds.test.JestIntegration
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import kibanaAgent
import templates.KibanaTemplate

object EsSnapshotsProject : Project({
  id("ES_Snapshots")
  name = "ES Snapshots"

  val esBuild = BuildType {
    id("ES_Build")
    name = "ES Build"

    kibanaAgent(2)

    steps {
      script {
        name = "Build"
        scriptContent =
          """
                #!/bin/bash
                echo "##teamcity[setParameter name='env.ES_SNAPSHOT_MANIFEST' value='https://storage.googleapis.com/kibana-ci-es-snapshots-daily/8.0.0/manifest-latest.json']"
        """.trimIndent()
      }
    }
  }

  buildType(esBuild)
  buildType(ESSnapshotBuild)

//  val defaultCiGroups = (1..DEFAULT_CI_GROUP_COUNT).map {
//    DefaultCiGroup(it) {
//      id("ES_Verify_DefaultCiGroup_$it")
//
//      // this.depParamRefs
//      params {
//        val buildId = esBuild.id?.value ?: ""
//        param("env.ES_SNAPSHOT_MANIFEST", "%dep.$buildId.env.ES_SNAPSHOT_MANIFEST%")
//      }
//
//      dependsOn(esBuild)
//    }
//  }

  val cloneForVerify = { build: BuildType ->
    val newBuild = BuildType()
    build.copyTo(newBuild)
    newBuild.id = AbsoluteId(build.id?.toString() + "_ES_Snapshots")
    newBuild.params {
      val buildId = esBuild.id?.value ?: ""
      param("env.ES_SNAPSHOT_MANIFEST", "%dep.$buildId.env.ES_SNAPSHOT_MANIFEST%")
    }
    newBuild.dependsOn(esBuild)
    newBuild.steps.items.removeIf { it.name == "Failed Test Reporter" }
    newBuild
  }

  val allTestJobs: ArrayList<BuildType> = ArrayList()

  subProject {
    id("ES_Snapshot_Tests")
    name = "Tests"

    defaultTemplate = KibanaTemplate

    subProject {
      id("ES_Snapshot_Tests_OSS")
      name = "OSS Distro Tests"

      val buildsToClone = listOf(
        *ossCiGroups.toTypedArray(),
        OssPluginFunctional
      )

      val clonedBuilds = buildsToClone.map { cloneForVerify(it) }

      clonedBuilds.forEach {
        buildType(it)
      }

      val composite = BuildType {
        id("ES_Snapshots_OSS_Tests_Composite")
        name = "OSS Distro Tests"
        type = BuildTypeSettings.Type.COMPOSITE

        dependsOn(*clonedBuilds.toTypedArray())
      }

      buildType(composite)
      allTestJobs.add(composite)
    }

    subProject {
      id("ES_Snapshot_Tests_Default")
      name = "Default Distro Tests"

      val buildsToClone = listOf(
        *defaultCiGroups.toTypedArray(),
        DefaultSecuritySolution
      )

      val clonedBuilds = buildsToClone.map { cloneForVerify(it) }

      clonedBuilds.forEach {
        buildType(it)
      }

      val composite = BuildType {
        id("ES_Snapshots_Default_Tests_Composite")
        name = "Default Distro Tests"
        type = BuildTypeSettings.Type.COMPOSITE

        dependsOn(*clonedBuilds.toTypedArray())
      }

      buildType(composite)
      allTestJobs.add(composite)
    }

    subProject {
      id("ES_Snapshot_Tests_Integration")
      name = "Integration Tests"

      val buildsToClone = listOf(
        ApiIntegration,
        JestIntegration
      )

      val clonedBuilds = buildsToClone.map { cloneForVerify(it) }

      clonedBuilds.forEach {
        buildType(it)
        allTestJobs.add(it)
      }
    }
  }

  buildType(BuildType {
    id("ES_Snapshots_All_Tests_Composite")
    name = "All Tests"
    type = BuildTypeSettings.Type.COMPOSITE

    dependsOn(
      esBuild,
      OssBuild,
      DefaultBuild,
      *allTestJobs.toTypedArray()
    )
  })
})
