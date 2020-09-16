package builds.es_snapshots

import builds.default.defaultCiGroups
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

  val defaultCiGroupsCloned = defaultCiGroups.map { cloneForVerify(it) }

  subProject {
    id("ES_Snapshot_Tests")
    name = "Tests"

    defaultTemplate = KibanaTemplate

    defaultCiGroupsCloned.forEach {
      buildType(it)
    }

    buildType(BuildType {
      id("ES_Snapshots_Default_CIGroups_Composite")
      name = "CI Groups"
      type = BuildTypeSettings.Type.COMPOSITE

      dependsOn(*defaultCiGroupsCloned.toTypedArray())
    })
  }
})
