package vcs

import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Kibana : GitVcsRoot({
  id("kibana_master")

  name = "kibana / master"
  url = "https://github.com/elastic/kibana.git"
  branch = "refs/heads/master_teamcity"
})
