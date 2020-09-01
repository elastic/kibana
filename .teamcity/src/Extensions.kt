import jetbrains.buildServer.configs.kotlin.v2019_2.*

fun BuildFeatures.junit(dirs: String = "target/**/TEST-*.xml") {
  feature {
    type = "xml-report-plugin"
    param("xmlReportParsing.reportType", "junit")
    param("xmlReportParsing.reportDirs", dirs)
  }
}

fun ProjectFeatures.kibanaAgent(init: ProjectFeature.() -> Unit) {
  val wrapped = ProjectFeature {
    type = "CloudImage"
    param("subnet", "teamcity")
    param("growingId", "true")
    param("agent_pool_id", "-2")
    param("sourceProject", "elastic-kibana-184716")
//      param("source-id", "elastic-kibana-ci-ubuntu-1804-lts-")
    param("network", "teamcity")
    param("preemptible", "false")
//      param("sourceImageFamily", "elastic-kibana-ci-ubuntu-1804-lts")
//      param("sourceImageFamily", "kibana-teamcity-dev-agents")
    param("sourceImageFamily", "kibana-ci-elastic-dev")
    param("zone", "us-central1-a")
    param("profileId", "kibana-brianseeders")
    param("diskType", "pd-ssd")
    param("machineCustom", "false")
    param("maxInstances", "20")
    param("imageType", "ImageFamily")
    param("diskSizeGb", "")
    init()
  }
  feature(wrapped)
}

fun ProjectFeatures.kibanaAgent(size: String, init: ProjectFeature.() -> Unit = {}) {
  kibanaAgent {
    id = "KIBANA_BRIANSEEDERS_STANDARD_$size"
    param("source-id", "kibana-standard-$size-")
    param("machineType", "n2-standard-$size")
    init()
  }
}

fun BuildType.kibanaAgent(size: String) {
  requirements {
    startsWith("teamcity.agent.name", "kibana-standard-$size-", "RQ_AGENT_NAME")
  }
}

fun BuildType.kibanaAgent(size: Int) {
  kibanaAgent(size.toString())
}
