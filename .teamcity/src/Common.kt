import jetbrains.buildServer.configs.kotlin.v2019_2.DslContext

// If set to true, github check/commit status will be reported, failed-test-reporter will run, etc.
const val ENABLE_REPORTING = false

// If set to false, jobs with triggers (scheduled, on commit, etc) will be paused
const val ENABLE_TRIGGERS = true

fun getProjectBranch(): String {
  return DslContext.projectName
}

fun getCorrespondingESBranch(): String {
  return getProjectBranch().replace("_teamcity", "")
}

fun areTriggersEnabled(): Boolean {
  return ENABLE_TRIGGERS;
}

fun isReportingEnabled(): Boolean {
  return ENABLE_REPORTING;
}

// master and 7.x get committed to so often, we only want to run full CI for them hourly
// but for other branches, we can run daily and on merge
fun isHourlyOnlyBranch(): Boolean {
  val branch = getProjectBranch()

  return branch == "master" || branch.matches("""^[0-9]+\.x$""".toRegex())
}

fun makeSafeId(id: String): String {
  return id.replace(Regex("[^a-zA-Z0-9_]"), "_")
}
