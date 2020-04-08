package com.jrjackson;

import org.jruby.Ruby;
import org.jruby.RubyObject;

public class RubyStringNameConverter implements RubyNameConverter {

    @Override
    public RubyObject convert(Ruby ruby, String name){
        return RubyUtils.rubyString(ruby, name);
    }
}
