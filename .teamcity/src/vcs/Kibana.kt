package vcs

import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Kibana : GitVcsRoot({
  id("kibana_7.x")

  name = "kibana / 7.x"
  url = "https://github.com/elastic/kibana.git"
  branch = "refs/heads/7.x_teamcity"
})
