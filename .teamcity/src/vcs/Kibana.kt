package vcs

import getProjectBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot
import makeSafeId

object Kibana : GitVcsRoot({
  id("kibana_${makeSafeId(getProjectBranch())}")

  name = "kibana / ${getProjectBranch()}"
  url = "https://github.com/elastic/kibana.git"
  branch = "refs/heads/${getProjectBranch()}"
})
