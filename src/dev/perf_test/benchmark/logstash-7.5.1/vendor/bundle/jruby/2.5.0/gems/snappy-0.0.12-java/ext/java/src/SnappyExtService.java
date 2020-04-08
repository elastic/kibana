import org.jruby.Ruby;
import org.jruby.RubyModule;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.runtime.load.Library;
import org.jruby.runtime.load.BasicLibraryService;

import snappy.SnappyModule;


public class SnappyExtService implements BasicLibraryService {
  public boolean basicLoad(final Ruby runtime) {
    RubyModule snappyModule = runtime.defineModule("Snappy");
    snappyModule.defineAnnotatedMethods(SnappyModule.class);
    return true;
  }
}
