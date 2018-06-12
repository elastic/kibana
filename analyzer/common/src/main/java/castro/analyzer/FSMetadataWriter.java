package castro.analyzer;

import castro.metadata.Node;
import com.google.protobuf.CodedOutputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class FSMetadataWriter implements MetadataWriter {
  private Logger logger = LoggerFactory.getLogger(getClass());

  private FileOutputStream rawNodeStream;
  private CodedOutputStream nodeStream;

  public FSMetadataWriter(File baseDir) {
    try {
      var file = new File(baseDir, "node");
      if (!file.exists()) {
        file.createNewFile();
      }
      this.rawNodeStream = new FileOutputStream(file);
      this.nodeStream = CodedOutputStream.newInstance(rawNodeStream);
    } catch (IOException e) {
      logger.error("Initialization Error", e);
    }
  }

  @Override
  public MetadataWriter writeNode(Node node) {
    try {
      nodeStream.writeMessageNoTag(node);
    } catch (IOException e) {
      logger.error("Node Write Error", e);
    }
    return this;
  }


  @Override
  public void close() {
    try {
      nodeStream.flush();
      rawNodeStream.close();
    } catch (IOException e) {
      logger.error("Serializer close error", e);
    }
  }
}
