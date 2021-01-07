import co.elastic.teamcity.common.getOrgProjectIdKebab
import jetbrains.buildServer.configs.kotlin.v2019_2.DslContext

// If set to true, github check/commit status will be reported, failed-test-reporter will run, etc.
const val ENABLE_REPORTING = false

// If set to false, jobs with triggers (scheduled, on commit, etc) will be paused
const val ENABLE_TRIGGERS = false

fun getProjectBranch(): String {
  // There's no good way to retrieve this information, except to have the convention that the root project name is based on the branch
  // There are DSL Context Parameters which would work, except that they can only be managed via the UI.
  return DslContext.projectName
}

fun getCorrespondingESBranch(): String {
  return getOrgProjectIdKebab().replace("_teamcity", "")
}

fun areTriggersEnabled(): Boolean {
  return ENABLE_TRIGGERS;
}

fun isReportingEnabled(): Boolean {
  return ENABLE_REPORTING;
}
