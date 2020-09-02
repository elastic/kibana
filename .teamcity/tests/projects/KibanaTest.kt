package projects

import org.junit.Assert.*
import org.junit.Test

val TestConfig = KibanaConfiguration("network", "subnet")

class KibanaTest {
  @Test
  fun test_Default_Configuration_Exists() {
    assertNotNull(kibanaConfiguration)
    assertEquals("teamcity", kibanaConfiguration.agentNetwork)
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
