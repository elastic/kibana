package settings

import org.junit.Assert.assertTrue
import org.junit.Test

class KibanaTest {
  @Test
  fun test_CloudImages_Exist() {
    val project = Kibana

    assertTrue(project.features.items.any { it.type == "CloudImage" })
  }
}
