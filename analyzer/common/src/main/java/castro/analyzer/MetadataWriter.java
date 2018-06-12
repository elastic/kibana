package castro.analyzer;

import castro.metadata.Node;

interface MetadataWriter {
  MetadataWriter writeNode(Node node);
  void close();
}
