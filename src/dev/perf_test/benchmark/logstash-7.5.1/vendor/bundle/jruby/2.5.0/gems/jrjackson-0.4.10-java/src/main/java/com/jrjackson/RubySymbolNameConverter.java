package com.jrjackson;

import org.jruby.Ruby;
import org.jruby.RubyObject;

public class RubySymbolNameConverter implements RubyNameConverter {
    
    @Override
    public RubyObject convert(Ruby ruby, String s) {
        return RubyUtils.rubySymbol(ruby, s);
    }
}
