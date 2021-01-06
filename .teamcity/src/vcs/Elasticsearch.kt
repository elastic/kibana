package vcs

import jetbrains.buildServer.configs.kotlin.v2019_2.DslContext
import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Elasticsearch : GitVcsRoot({
  id("elasticsearch_${DslContext.getParameter("projectBranch")}")

  name = "elasticsearch / ${DslContext.getParameter("projectBranch")}"
  url = "https://github.com/elastic/elasticsearch.git"
  branch = "refs/heads/${DslContext.getParameter("projectBranch")}"
})
