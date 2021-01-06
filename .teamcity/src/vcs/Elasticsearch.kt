package vcs

import getProjectBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Elasticsearch : GitVcsRoot({
  id("elasticsearch_${getProjectBranch()}")

  name = "elasticsearch / ${getProjectBranch()}"
  url = "https://github.com/elastic/elasticsearch.git"
  branch = "refs/heads/${getProjectBranch()}"
})
