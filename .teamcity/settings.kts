import jetbrains.buildServer.configs.kotlin.v2019_2.*
import projects.Kibana
import projects.KibanaConfiguration

version = "2020.1"

val config = KibanaConfiguration(
  DSLContext.getParameter("agentNetwork", "teamcity"),
  DSLContext.getParameter("agentSubnet", "teamcity")
)

project(Kibana(config))
