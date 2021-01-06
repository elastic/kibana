package vcs

import getProjectBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Kibana : GitVcsRoot({
  id("kibana_${getProjectBranch()}")

  name = "kibana / ${getProjectBranch()}"
  url = "https://github.com/elastic/kibana.git"
  branch = "refs/heads/${getProjectBranch()}"
})
