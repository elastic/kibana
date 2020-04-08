package com.jrjackson;

import org.jruby.Ruby;
import org.jruby.RubyObject;

public interface RubyNameConverter {

    public RubyObject convert(Ruby ruby, String name);
}
