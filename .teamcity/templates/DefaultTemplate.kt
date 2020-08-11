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
      param("env.TEST_BROWSER_HEADLESS", "1")
//
//        // For now these are just to ensure compatibility with existing Jenkins-based configuration
//        param("env.JENKINS_URL", "%teamcity.serverUrl%")
//        param("env.BUILD_URL", "%teamcity.serverUrl%/build/%teamcity.build.id%")
//        param("env.JOB_NAME", "%system.teamcity.buildType.id%")

      param("env.BUILD_ID", "%build.number%")
      param("env.GIT_BRANCH", "%vcsroot.branch%")
      param("env.branch_specifier", "%vcsroot.branch%")
    }

//    steps {
//        script {
//            name = "Setup Build Environment (Unix)"
//
//            conditions {
//                doesNotContain("teamcity.agent.jvm.os.name", "Windows")
//            }
//
//            scriptContent = """
//                #!/usr/bin/env bash
//            """.trimIndent()
//        }
//
//        placeholder { }
//
//        script {
//            name = "Notify H.O.M.E.R. Webhook"
//
//            conditions {
//                doesNotContain("teamcity.agent.jvm.os.name", "Windows")
//                doesNotEqual("system.build.is.personal", "true")
//            }
//
//            scriptContent = """
//                #!/usr/bin/env bash
//                curl -sS -X POST -H "Content-Type: text/plain" --data "%teamcity.serverUrl%/app/rest/builds/%teamcity.build.id%" https://homer.app.elstc.co/webhook/teamcity/build-finished || true
//            """.trimIndent()
//        }
//    }
})
