package com.jrjackson;

import com.fasterxml.jackson.core.*;

import java.io.IOException;
import java.nio.CharBuffer;
import org.jruby.Ruby;
import org.jruby.RubyObject;

public class RubyStringConverter implements RubyConverter {

    @Override
    public RubyObject convert(Ruby ruby, JsonParser jp) throws IOException {
        return RubyUtils.rubyString(ruby, 
            CharBuffer.wrap(jp.getTextCharacters(), 0, jp.getTextLength())
        );
    }
}
