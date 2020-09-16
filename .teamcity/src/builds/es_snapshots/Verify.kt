package builds.es_snapshots

import builds.default.DEFAULT_CI_GROUP_COUNT
import builds.default.DefaultCiGroup
import builds.default.defaultCiGroups
import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import kibanaAgent

object VerifyProject : Project({
  id("ES_Verify")
  name = "ES Verify"

  val esBuild = BuildType {
    id("ES_Build")
    name = "ES Build"

    kibanaAgent(2)

    templates(Template {
      id("Empty_Template")
      name = "Empty Template"
    })

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
    newBuild.id("ES_Verify_" + build.id?.toString())
    newBuild.params {
      val buildId = esBuild.id?.value ?: ""
      param("env.ES_SNAPSHOT_MANIFEST", "%dep.$buildId.env.ES_SNAPSHOT_MANIFEST%")
    }
    newBuild.dependsOn(esBuild)
    newBuild
  }

  val defaultCiGroupsCloned = defaultCiGroups.map { cloneForVerify(it) }

  defaultCiGroupsCloned.forEach {
    buildType(it)
  }

  buildType(BuildType {
    id("ES_Verify_Default_CIGroups_Composite")
    name = "CI Groups"
    type = BuildTypeSettings.Type.COMPOSITE

    dependsOn(*defaultCiGroupsCloned.toTypedArray())
  })
})
