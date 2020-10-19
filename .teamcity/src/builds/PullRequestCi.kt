package builds

import dependsOn
import jetbrains.buildServer.configs.kotlin.v2019_2.AbsoluteId
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.PullRequests
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.commitStatusPublisher
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.pullRequests
import vcs.Kibana

object PullRequestCi : BuildType({
  id = AbsoluteId("Kibana_PullRequest_CI")
  name = "Pull Request CI"
  type = Type.COMPOSITE

   buildNumberPattern = "%build.counter%-%env.GITHUB_PR_OWNER%-%env.GITHUB_PR_BRANCH%"

  vcs {
    root(Kibana)
    checkoutDir = "kibana"

    branchFilter = "+:pull/*"
  }

  params {
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
    pullRequests {
      vcsRootExtId = "${Kibana.id}"
      provider = github {
        authType = token {
          token = "credentialsJSON:07d22002-12de-4627-91c3-672bdb23b55b"
        }
        filterTargetBranch = "refs/heads/master_teamcity"
        filterAuthorRole = PullRequests.GitHubRoleFilter.MEMBER
      }
    }
    commitStatusPublisher {
      vcsRootExtId = "${Kibana.id}"
      publisher = github {
        githubUrl = "https://api.github.com"
        authType = personalToken {
          token = "credentialsJSON:07d22002-12de-4627-91c3-672bdb23b55b"
        }
      }
    }
  }

  dependsOn(FullCi)
})
