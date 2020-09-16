package builds.es_snapshots

import builds.default.DEFAULT_CI_GROUP_COUNT
import builds.default.DefaultCiGroup
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildTypeSettings
import jetbrains.buildServer.configs.kotlin.v2019_2.Project
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import kibanaAgent

object VerifyProject : Project({
  id("ES_Verify")
  name = "ES Verify"

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
                echo "##teamcity[setParameter name='env.ES_SNAPSHOT_MANIFEST' value='http://localhost']"
        """.trimIndent()
      }
    }
  }

  buildType(esBuild)

  val defaultCiGroups = (1..DEFAULT_CI_GROUP_COUNT).map {
    DefaultCiGroup(it) {
      id("ES_Verify_DefaultCiGroup_$it")

      params {
        val buildId = esBuild.id?.value ?: ""
        param("env.ES_SNAPSHOT_MANIFEST", "%dep.$buildId.env.ES_SNAPSHOT_MANIFEST%")
      }

      dependsOn(esBuild)
    }
  }

  defaultCiGroups.forEach { buildType(it) }

  buildType(BuildType {
    id("ES_Verify_Default_CIGroups_Composite")
    name = "CI Groups"
    type = BuildTypeSettings.Type.COMPOSITE

    dependsOn(*defaultCiGroups.toTypedArray())
  })
})
