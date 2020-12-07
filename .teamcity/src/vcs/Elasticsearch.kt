package vcs

import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Elasticsearch : GitVcsRoot({
  id("elasticsearch_master")

  name = "elasticsearch / master"
  url = "https://github.com/elastic/elasticsearch.git"
  branch = "refs/heads/master"
})
