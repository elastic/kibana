package vcs

import getCorrespondingESBranch
import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot
import makeSafeId

object Elasticsearch : GitVcsRoot({
  id("elasticsearch_${makeSafeId(getCorrespondingESBranch())}")

  name = "elasticsearch / ${getCorrespondingESBranch()}"
  url = "https://github.com/elastic/elasticsearch.git"
  branch = "refs/heads/${getCorrespondingESBranch()}"
})
