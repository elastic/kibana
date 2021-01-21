package builds

import builds.default.DefaultSavedObjectFieldMetrics
import dependsOn
import getProjectBranch
import isReportingEnabled
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.commitStatusPublisher
import vcs.Kibana

object PullRequestCi : BuildType({
  id("Pull_Request")
  name = "Pull Request CI"
  type = Type.COMPOSITE

   buildNumberPattern = "%build.counter%-%env.GITHUB_PR_OWNER%-%env.GITHUB_PR_BRANCH%"

  vcs {
    root(Kibana)
    checkoutDir = "kibana"

    branchFilter = "+:pull/*"
    excludeDefaultBranchChanges = true
  }

  val prAllowedList = listOf(
    "brianseeders",
    "alexwizp",
    "barlowm",
    "DziyanaDzeraviankina",
    "maryia-lapata",
    "renovate[bot]",
    "sulemanof",
    "VladLasitsa"
  )

  params {
    param("elastic.pull_request.enabled", "true")
    param("elastic.pull_request.target_branch", getProjectBranch())
    param("elastic.pull_request.allow_org_users", "true")
    param("elastic.pull_request.allowed_repo_permissions", "admin,write")
    param("elastic.pull_request.allowed_list", prAllowedList.joinToString(","))
    param("elastic.pull_request.cancel_in_progress_builds_on_update", "true")

    // These params should get filled in by the app that triggers builds
    param("env.GITHUB_PR_TARGET_BRANCH", "")
    param("env.GITHUB_PR_NUMBER", "")
    param("env.GITHUB_PR_OWNER", "")
    param("env.GITHUB_PR_REPO", "")
    param("env.GITHUB_PR_BRANCH", "")
    param("env.GITHUB_PR_TRIGGERED_SHA", "")
    param("env.GITHUB_PR_LABELS", "")
    param("env.GITHUB_PR_TRIGGER_COMMENT", "")

    param("reverse.dep.*.env.GITHUB_PR_TARGET_BRANCH", "")
    param("reverse.dep.*.env.GITHUB_PR_NUMBER", "")
    param("reverse.dep.*.env.GITHUB_PR_OWNER", "")
    param("reverse.dep.*.env.GITHUB_PR_REPO", "")
    param("reverse.dep.*.env.GITHUB_PR_BRANCH", "")
    param("reverse.dep.*.env.GITHUB_PR_TRIGGERED_SHA", "")
    param("reverse.dep.*.env.GITHUB_PR_LABELS", "")
    param("reverse.dep.*.env.GITHUB_PR_TRIGGER_COMMENT", "")
  }

  features {
    if(isReportingEnabled()) {
      commitStatusPublisher {
        enabled = true
        vcsRootExtId = "${Kibana.id}"
        publisher = github {
          githubUrl = "https://api.github.com"
          authType = personalToken {
            token = "credentialsJSON:07d22002-12de-4627-91c3-672bdb23b55b"
          }
        }
      }
    }
  }

  dependsOn(
    FullCi,
    DefaultSavedObjectFieldMetrics
  )
})
