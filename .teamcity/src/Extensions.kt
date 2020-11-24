import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.notifications
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.ScriptBuildStep
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2019_2.ui.insert
import projects.kibanaConfiguration

fun BuildFeatures.junit(dirs: String = "target/**/TEST-*.xml") {
  feature {
    type = "xml-report-plugin"
    param("xmlReportParsing.reportType", "junit")
    param("xmlReportParsing.reportDirs", dirs)
  }
}

fun ProjectFeatures.kibanaAgent(init: ProjectFeature.() -> Unit) {
  feature {
    type = "CloudImage"
    param("network", kibanaConfiguration.agentNetwork)
    param("subnet", kibanaConfiguration.agentSubnet)
    param("growingId", "true")
    param("agent_pool_id", "-2")
    param("preemptible", "false")
    param("sourceProject", "elastic-images-prod")
    param("sourceImageFamily", "elastic-kibana-ci-ubuntu-1804-lts")
    param("zone", "us-central1-a")
    param("profileId", "kibana")
    param("diskType", "pd-ssd")
    param("machineCustom", "false")
    param("maxInstances", "200")
    param("imageType", "ImageFamily")
    param("diskSizeGb", "75") // TODO
    init()
  }
}

fun ProjectFeatures.kibanaAgent(size: String, init: ProjectFeature.() -> Unit = {}) {
  kibanaAgent {
    id = "KIBANA_STANDARD_$size"
    param("source-id", "kibana-standard-$size-")
    param("machineType", "n2-standard-$size")
    init()
  }
}

fun BuildType.kibanaAgent(size: String) {
  requirements {
    startsWith("teamcity.agent.name", "kibana-standard-$size-", "RQ_AGENT_NAME")
  }
}

fun BuildType.kibanaAgent(size: Int) {
  kibanaAgent(size.toString())
}

val testArtifactRules = """
    target/kibana-*
    target/test-metrics/*
    target/kibana-security-solution/**/*.png
    target/junit/**/*
    target/test-suites-ci-plan.json
    test/**/screenshots/session/*.png
    test/**/screenshots/failure/*.png
    test/**/screenshots/diff/*.png
    test/functional/failure_debug/html/*.html
    x-pack/test/**/screenshots/session/*.png
    x-pack/test/**/screenshots/failure/*.png
    x-pack/test/**/screenshots/diff/*.png
    x-pack/test/functional/failure_debug/html/*.html
    x-pack/test/functional/apps/reporting/reports/session/*.pdf
  """.trimIndent()

fun BuildType.addTestSettings() {
  artifactRules += "\n" + testArtifactRules
  steps {
    failedTestReporter()
  }
  features {
    junit()
  }
}

fun BuildType.addSlackNotifications(to: String = "#kibana-teamcity-testing") {
  params {
    param("elastic.slack.enabled", "true")
    param("elastic.slack.channels", to)
  }
}

fun BuildType.dependsOn(buildType: BuildType, init: SnapshotDependency.() -> Unit = {}) {
  dependencies {
    snapshot(buildType) {
      reuseBuilds = ReuseBuilds.SUCCESSFUL
      onDependencyCancel = FailureAction.ADD_PROBLEM
      onDependencyFailure = FailureAction.ADD_PROBLEM
      synchronizeRevisions = true
      init()
    }
  }
}

fun BuildType.dependsOn(vararg buildTypes: BuildType, init: SnapshotDependency.() -> Unit = {}) {
  buildTypes.forEach { dependsOn(it, init) }
}

fun BuildSteps.failedTestReporter(init: ScriptBuildStep.() -> Unit = {}) {
  script {
    name = "Failed Test Reporter"
    scriptContent =
      """
        #!/bin/bash
        node scripts/report_failed_tests
      """.trimIndent()
    executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
    init()
  }
}

// Note: This is currently only used for tests and has a retry in it for flaky tests.
// The retry should be refactored if runbld is ever needed for other tasks.
fun BuildSteps.runbld(stepName: String, script: String) {
  script {
    name = stepName

    // The indentation for this string is like this to ensure 100% that the RUNBLD-SCRIPT heredoc termination will not have spaces at the beginning
    scriptContent =
"""#!/bin/bash

set -euo pipefail

source .ci/teamcity/util.sh

branchName="${'$'}GIT_BRANCH"
branchName="${'$'}{branchName#refs\/heads\/}"

if [[ "${'$'}{GITHUB_PR_NUMBER-}" ]]; then
  branchName=pull-request
fi

project=kibana
if [[ "${'$'}{ES_SNAPSHOT_MANIFEST-}" ]]; then
  project=kibana-es-snapshot-verify
fi

# These parameters are only for runbld reporting
export JENKINS_HOME="${'$'}HOME"
export BUILD_URL="%teamcity.serverUrl%/build/%teamcity.build.id%"
export branch_specifier=${'$'}branchName
export NODE_LABELS='teamcity'
export BUILD_NUMBER="%build.number%"
export EXECUTOR_NUMBER=''
export NODE_NAME=''

export OLD_PATH="${'$'}PATH"

file=${'$'}(mktemp)

(
cat <<RUNBLD-SCRIPT
#!/bin/bash
export PATH="${'$'}OLD_PATH"
$script
RUNBLD-SCRIPT
) > ${'$'}file

tc_retry /usr/local/bin/runbld -d "${'$'}(pwd)" --job-name="elastic+${'$'}project+${'$'}branchName" ${'$'}file
"""
  }
}
