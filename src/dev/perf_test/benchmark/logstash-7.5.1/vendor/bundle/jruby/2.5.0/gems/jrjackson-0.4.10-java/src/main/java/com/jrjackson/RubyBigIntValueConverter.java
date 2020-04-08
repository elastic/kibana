package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import java.io.IOException;
import org.jruby.Ruby;
import org.jruby.RubyObject;

/**
 *
 * @author Guy Boertje
 */
public class RubyBigIntValueConverter implements RubyConverter {

    @Override
    public RubyObject convert(Ruby ruby, JsonParser jp) throws IOException {
        if (jp.getNumberType() == JsonParser.NumberType.BIG_INTEGER) {
            return RubyUtils.rubyBignum(ruby, jp.getBigIntegerValue());
        }
        return RubyUtils.rubyFixnum(ruby, jp.getLongValue());
    }
}
