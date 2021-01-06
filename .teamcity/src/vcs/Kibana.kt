package vcs

import jetbrains.buildServer.configs.kotlin.v2019_2.DslContext
import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Kibana : GitVcsRoot({
  id("kibana_${DslContext.getParameter("projectBranch")}")

  name = "kibana / ${DslContext.getParameter("projectBranch")}"
  url = "https://github.com/elastic/kibana.git"
  branch = "refs/heads/${DslContext.getParameter("projectBranch")}"
})
