package vcs

import getCorrespondingESBranch
import getProjectBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot

object Elasticsearch : GitVcsRoot({
  id("elasticsearch_${getCorrespondingESBranch().replace("/", "_")}")

  name = "elasticsearch / ${getCorrespondingESBranch()}"
  url = "https://github.com/elastic/elasticsearch.git"
  branch = "refs/heads/${getCorrespondingESBranch()}"
})
