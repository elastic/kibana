package castro.analyzer;

import castro.metadata.Node;

import java.io.IOException;

interface MetadataReader {
  Node readNode() throws IOException;
  void close();
}
