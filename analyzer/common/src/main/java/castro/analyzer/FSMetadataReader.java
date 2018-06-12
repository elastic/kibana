package castro.analyzer;

import castro.metadata.Node;
import com.google.protobuf.CodedInputStream;
import com.google.protobuf.ExtensionRegistryLite;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;

public class FSMetadataReader implements MetadataReader {
  private Logger logger = LoggerFactory.getLogger(getClass());

  private FileInputStream rawNodeStream;
  private CodedInputStream nodeStream;

  public FSMetadataReader(File baseDir) {
    try {
      this.rawNodeStream = new FileInputStream(new File(baseDir, "node"));
      this.nodeStream = CodedInputStream.newInstance(rawNodeStream);
    } catch (FileNotFoundException e) {
      logger.error("Initialization Error", e);
    }
  }

  @Override
  public Node readNode() throws IOException {
      var builder = Node.newBuilder();
      nodeStream.readMessage(builder, ExtensionRegistryLite.getEmptyRegistry());
      return builder.build();
  }

  @Override
  public void close() {
    try {
      rawNodeStream.close();
    } catch (IOException e) {
      logger.error("Serializer close error", e);
    }
  }
}
