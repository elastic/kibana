package castro.analyzer;

import castro.metadata.Node;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TestName;

import java.io.File;
import java.io.IOException;

import static junit.framework.TestCase.assertEquals;
import static junit.framework.TestCase.assertTrue;

public class MetadataWriteReadTest {

  @Rule
  public TestName testName = new TestName();


  @Test
  public void checkNodeWriteRead() throws IOException {
    var file = File.createTempFile(testName.getMethodName(), "");
    file.delete();
    file.mkdir();
    assertTrue(file.isDirectory());


    Node n1 = Node.newBuilder().setIdentifier("1").build();
    Node n2 = Node.newBuilder().setIdentifier("2").setQname("str").build();

    var writer = new FSMetadataWriter(file);
    writer.writeNode(n1).writeNode(n2).close();

    var reader = new FSMetadataReader(file);
    Node n3 = reader.readNode();
    Node n4 = reader.readNode();

    assertEquals(n1, n3);
    assertEquals(n2, n4);

    reader.close();
  }

}
