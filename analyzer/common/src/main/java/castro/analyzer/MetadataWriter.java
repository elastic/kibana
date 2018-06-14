package castro.analyzer;

import castro.metadata.Node;

public interface MetadataWriter {
  MetadataWriter writeNode(Node node);
  void close();
}
