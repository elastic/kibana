package builds

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import kibanaAgent

object Checks : BuildType({
  name = "Checks"
  description = "Executes Various Checks"

  kibanaAgent(4)

  val checkScripts = mapOf(
    "Check Telemetry Schema" to ".ci/teamcity/checks/telemetry.sh",
    "Check TypeScript Projects" to ".ci/teamcity/checks/ts_projects.sh",
    "Check File Casing" to ".ci/teamcity/checks/file_casing.sh",
    "Check Licenses" to ".ci/teamcity/checks/licenses.sh",
    "Verify NOTICE" to ".ci/teamcity/checks/verify_notice.sh",
    "Test Hardening" to ".ci/teamcity/checks/test_hardening.sh",
    "Check Types" to ".ci/teamcity/checks/type_check.sh",
    "Check Doc API Changes" to ".ci/teamcity/checks/doc_api_changes.sh",
    "Check Bundle Limits" to ".ci/teamcity/checks/bundle_limits.sh",
    "Check i18n" to ".ci/teamcity/checks/i18n.sh"
  )

  steps {
    for (checkScript in checkScripts) {
      script {
        name = checkScript.key
        scriptContent = """
          #!/bin/bash
          ${checkScript.value}
        """.trimIndent()
      }
    }
  }
})
