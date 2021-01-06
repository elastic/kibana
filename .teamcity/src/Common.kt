const val PROJECT_BRANCH = "master_teamcity"
const val CORRESPONDING_ES_BRANCH = "master"

// If set to true, github check/commit status will be reported, failed-test-reporter will run, etc.
const val ENABLE_REPORTING = false

// If set to false, jobs with triggers (scheduled, on commit, etc) will be paused
const val ENABLE_TRIGGERS = false

fun getProjectBranch(): String {
  return PROJECT_BRANCH
}

fun getCorrespondingESBranch(): String {
  return CORRESPONDING_ES_BRANCH
}

fun areTriggersEnabled(): Boolean {
  return ENABLE_TRIGGERS;
}

fun isReportingEnabled(): Boolean {
  return ENABLE_REPORTING;
}
