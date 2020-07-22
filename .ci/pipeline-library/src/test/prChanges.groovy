import org.junit.*
import static groovy.test.GroovyAssert.*

class PrChangesTest extends KibanaBasePipelineTest {
  def prChanges

  @Before
  void setUp() {
    super.setUp()

    env.ghprbPullId = '1'

    props([
      githubPr: [
        isPr: { true },
      ],
    ])

    prChanges = loadScript("vars/prChanges.groovy")
  }

  @Test
  void 'areChangesSkippable() with no changes'() {
    props([
      githubPrs: [
        getChanges: { [] },
      ],
    ])

    assertTrue(prChanges.areChangesSkippable())
  }

  @Test
  void 'areChangesSkippable() with skippable changes'() {
    props([
      githubPrs: [
        getChanges: { [
          [filename: 'docs/test/a-fake-doc.asciidoc'],
          [filename: 'README.md'],
        ] },
      ],
    ])

    assertTrue(prChanges.areChangesSkippable())
  }

  @Test
  void 'areChangesSkippable() with skippable renames'() {
    props([
      githubPrs: [
        getChanges: { [
          [ filename: 'docs/test/a-fake-doc.asciidoc', previousFilename: 'docs/test/a-different-fake-doc.asciidoc' ],
          [ filename: 'README.md', previousFilename: 'README-old.md' ],
        ] },
      ],
    ])

    assertTrue(prChanges.areChangesSkippable())
  }

  @Test
  void 'areChangesSkippable() with unskippable changes'() {
    props([
      githubPrs: [
        getChanges: { [
          [filename: 'src/core/index.ts'],
        ] },
      ],
    ])

    assertFalse(prChanges.areChangesSkippable())
  }

  @Test
  void 'areChangesSkippable() with skippable and unskippable changes'() {
    props([
      githubPrs: [
        getChanges: { [
          [filename: 'README.md'],
          [filename: 'src/core/index.ts'],
        ] },
      ],
    ])

    assertFalse(prChanges.areChangesSkippable())
  }
}
