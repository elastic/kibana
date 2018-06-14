package castro.analyzer;

import castro.metadata.Node;

import java.io.IOException;

public interface MetadataReader {
  Node readNode() throws IOException;
  void close();
}
