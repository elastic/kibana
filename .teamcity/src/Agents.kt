import co.elastic.teamcity.common.GoogleCloudAgent
import co.elastic.teamcity.common.GoogleCloudAgentDiskType
import co.elastic.teamcity.common.GoogleCloudProfile

private val sizes = listOf("2", "4", "8", "16")

val StandardAgents = sizes.map { size -> size to GoogleCloudAgent {
  sourceImageFamily = "elastic-kibana-ci-ubuntu-1804-lts"
  agentPrefix = "kibana-standard-$size-"
  machineType = "n2-standard-$size"
  diskSizeGb = 75
  diskType = GoogleCloudAgentDiskType.SSD
  maxInstances = 750
} }.toMap()

val BuildAgent = GoogleCloudAgent {
  sourceImageFamily = "elastic-kibana-ci-ubuntu-1804-lts"
  agentPrefix = "kibana-c2-16-"
  machineType = "c2-standard-16"
  diskSizeGb = 250
  diskType = GoogleCloudAgentDiskType.SSD
  maxInstances = 200
}

val CloudProfile = GoogleCloudProfile {
  accessKeyId = "447fdd4d-7129-46b7-9822-2e57658c7422"

  agents(StandardAgents)
  agent(BuildAgent)
}
