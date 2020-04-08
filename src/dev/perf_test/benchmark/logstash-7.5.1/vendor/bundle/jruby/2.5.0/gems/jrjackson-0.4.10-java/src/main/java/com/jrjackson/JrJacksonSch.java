package com.jrjackson;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.anno.JRubyModule;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.exceptions.RaiseException;

@JRubyModule(name = "JrJacksonSch")
public class JrJacksonSch extends JrJacksonBase {

    public JrJacksonSch(Ruby ruby, RubyClass metaclass) {
        super(ruby, metaclass);
    }

    // deserialize
    @JRubyMethod(module = true, name = {"parse", "load"}, required = 3)
    public static IRubyObject parse(ThreadContext context, IRubyObject self, IRubyObject handler, IRubyObject arg, IRubyObject opts)
            throws RaiseException {
        StreamParse sp = new SchParse(context, handler);
        return _sjcparse(context, handler, arg, opts, sp);
    }
}
