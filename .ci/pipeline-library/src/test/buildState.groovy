import org.junit.*
import static groovy.test.GroovyAssert.*

class BuildStateTest extends KibanaBasePipelineTest {
  def buildState

  @Before
  void setUp() {
    super.setUp()

    buildState = loadScript("vars/buildState.groovy")
  }

  @Test
  void 'get() returns existing data'() {
    buildState.add('test', 1)
    def actual = buildState.get('test')
    assertEquals(1, actual)
  }

  @Test
  void 'get() returns null for missing data'() {
    def actual = buildState.get('missing_key')
    assertEquals(null, actual)
  }

  @Test
  void 'add() does not overwrite existing keys'() {
    assertTrue(buildState.add('test', 1))
    assertFalse(buildState.add('test', 2))

    def actual = buildState.get('test')

    assertEquals(1, actual)
  }

  @Test
  void 'set() overwrites existing keys'() {
    assertFalse(buildState.has('test'))
    buildState.set('test', 1)
    assertTrue(buildState.has('test'))
    buildState.set('test', 2)

    def actual = buildState.get('test')

    assertEquals(2, actual)
  }
}
