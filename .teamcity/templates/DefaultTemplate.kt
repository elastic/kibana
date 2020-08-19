/*
 * Licensed to Elasticsearch under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package templates

import DefaultRoot
import jetbrains.buildServer.configs.kotlin.v2019_2.ParameterDisplay
import jetbrains.buildServer.configs.kotlin.v2019_2.Template
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.placeholder
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object DefaultTemplate : Template({
  name = "Default Template"

  vcs {
    root(DefaultRoot)

    checkoutDir = "kibana"
  }

  params {
    param("env.CI", "true")

    // TODO remove these
    param("env.GCS_UPLOAD_PREFIX", "INVALID_PREFIX")
    param("env.CI_PARALLEL_PROCESS_NUMBER", "1")

    param("env.TEAMCITY_URL", "%teamcity.serverUrl%")
    param("env.TEAMCITY_BUILD_URL", "%teamcity.serverUrl%/build/%teamcity.build.id%")
    param("env.TEAMCITY_JOB_ID", "%system.teamcity.buildType.id%")
    param("env.TEAMCITY_BUILD_ID", "%build.number%")
    param("env.TEAMCITY_BUILD_NUMBER", "%teamcity.build.id%")

    param("env.GIT_BRANCH", "%vcsroot.branch%")
    param("env.GIT_COMMIT", "%build.vcs.number%")
    param("env.branch_specifier", "%vcsroot.branch%")

    password("env.CI_STATS_TOKEN", "credentialsJSON:eead8e13-ba61-429c-9ed6-344de6260381", display = ParameterDisplay.HIDDEN)
    password("env.CI_STATS_HOST", "credentialsJSON:f8462bff-1384-4c37-8ed7-914a6407f568", display = ParameterDisplay.HIDDEN)
  }

  steps {
    script {
      name = "Setup Environment"
      scriptContent = """
                #!/bin/bash
                ./.ci/teamcity/setup_env.sh
          """.trimIndent()
    }

    script {
      name = "Setup Node and Yarn"
      scriptContent = """
                #!/bin/bash
                ./.ci/teamcity/setup_node.sh
          """.trimIndent()
    }

    script {
      name = "Setup CI Stats"
      scriptContent = """
                #!/bin/bash
                node .ci/teamcity/setup_ci_stats.js
          """.trimIndent()
    }

    script {
      name = "Bootstrap"
      scriptContent = """
                #!/bin/bash
                ./.ci/teamcity/bootstrap.sh
          """.trimIndent()
    }

    placeholder {}
  }
})
