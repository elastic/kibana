package castro.analyzer.java;

import castro.analyzer.MetadataWriter;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.tools.javac.tree.JCTree;
import com.sun.tools.javac.tree.TreeScanner;

public class IndexScanner extends TreeScanner {
  private MetadataWriter writer;
  private CompilationUnitTree unit;


  @Override
  public void scan(JCTree tree) {

  }

}
