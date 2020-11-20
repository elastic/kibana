package vcs

import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Elasticsearch : GitVcsRoot({
  id("elasticsearch_7.x")

  name = "elasticsearch / 7.x"
  url = "https://github.com/elastic/elasticsearch.git"
  branch = "refs/heads/7.x"
})
