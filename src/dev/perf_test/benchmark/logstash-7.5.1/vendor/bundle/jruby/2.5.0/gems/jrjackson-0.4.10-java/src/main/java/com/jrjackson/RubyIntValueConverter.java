package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import java.io.IOException;
import org.jruby.Ruby;
import org.jruby.RubyObject;

/**
 *
 * @author Guy Boertje
 */
public class RubyIntValueConverter implements RubyConverter {

    @Override
    public RubyObject convert(Ruby ruby, JsonParser jp) throws IOException {
        return RubyUtils.rubyFixnum(ruby, jp.getLongValue());
    }
}
