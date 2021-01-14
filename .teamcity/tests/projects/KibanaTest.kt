package projects

<<<<<<< HEAD
=======
import jetbrains.buildServer.configs.kotlin.v2019_2.AbsoluteId
import jetbrains.buildServer.configs.kotlin.v2019_2.DslContext
import makeSafeId
>>>>>>> 245d521c9ad... [CI] Prep TeamCity pipelines to run in parallel with Jenkins (#87589)
import org.junit.Assert.*
import org.junit.Test

val TestConfig = KibanaConfiguration {
  agentNetwork = "network"
  agentSubnet = "subnet"
}

class KibanaTest {
  @Test
  fun test_Default_Configuration_Exists() {
    assertNotNull(kibanaConfiguration)
    Kibana()
    assertEquals("teamcity", kibanaConfiguration.agentNetwork)
  }

  @Test
  fun test_CloudImages_Exist() {
    val project = Kibana(TestConfig)

    assertTrue(project.features.items.any {
      it.type == "CloudImage" && it.params.any { param -> param.name == "network" && param.value == "network"}
    })
  }
}
