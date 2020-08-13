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
//
//        // For now these are just to ensure compatibility with existing Jenkins-based configuration
//        param("env.JENKINS_URL", "%teamcity.serverUrl%")
//        param("env.BUILD_URL", "%teamcity.serverUrl%/build/%teamcity.build.id%")
//        param("env.JOB_NAME", "%system.teamcity.buildType.id%")

    param("env.BUILD_ID", "%build.number%")
    param("env.GIT_BRANCH", "%vcsroot.branch%")
    param("env.branch_specifier", "%vcsroot.branch%")
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
      name = "Bootstrap"
      scriptContent = """
                #!/bin/bash
                ./.ci/teamcity/bootstrap.sh
          """.trimIndent()
    }

    placeholder {}
  }
})
