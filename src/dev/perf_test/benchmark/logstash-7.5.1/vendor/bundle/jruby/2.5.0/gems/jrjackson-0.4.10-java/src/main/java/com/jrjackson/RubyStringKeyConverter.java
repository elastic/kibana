package com.jrjackson;

import com.fasterxml.jackson.core.*;

import java.io.IOException;
import org.jruby.Ruby;
import org.jruby.RubyObject;

public class RubyStringKeyConverter implements RubyKeyConverter {

    @Override
    public RubyObject convert(Ruby ruby, JsonParser jp) throws IOException {
        return RubyUtils.rubyString(ruby, jp.getCurrentName());
    }
}
