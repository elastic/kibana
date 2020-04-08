package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.anno.JRubyModule;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;

import java.io.IOException;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.jruby.RubyHash;
import org.jruby.exceptions.RaiseException;


@JRubyModule(name = "JrJacksonJava")
public class JrJacksonJava extends JrJacksonBase {

    public JrJacksonJava(Ruby ruby, RubyClass metaclass) {
        super(ruby, metaclass);
    }

    // deserialize
    @JRubyMethod(module = true, name = {"parse", "load"}, required = 2)
    public static IRubyObject parse(ThreadContext context, IRubyObject self, IRubyObject arg, IRubyObject opts)
            throws JsonProcessingException, IOException, RaiseException {

        JavaConverter ikonv = new JavaBigIntValueConverter();
        JavaConverter dkonv = new JavaBigDecimalValueConverter();
        if (opts != context.nil) {
            RubyHash options = opts.convertToHash();
            if (options.size() > 0) {
                if (!flagged(options,
                        RubyUtils.rubySymbol(context.runtime, "use_bigdecimal"), true)) {
                    dkonv = new JavaFloatValueConverter();
                }
                if (flagged(options,
                        RubyUtils.rubySymbol(context.runtime, "use_smallint"))) {
                    ikonv = new JavaLongValueConverter();
                }
            }
        }

        JavaHandler handler = new JavaHandler(ikonv, dkonv);
        JjParse parse = new JjParse(handler);
        JsonParser jp;
        try {
            jp = buildParser(context, RubyJacksonModule.factory, arg);
        } catch (IOException e) {
            throw context.runtime.newIOError(e.getLocalizedMessage());
        }

        parse.deserialize(jp);
        jp.close();
        return RubyUtils.rubyObject(context.runtime, handler.getResult());
    }

    // deserialize
    @JRubyMethod(module = true, name = {"parse_raw", "load_raw"}, required = 2)
    public static IRubyObject parse_raw(ThreadContext context, IRubyObject self, IRubyObject arg, IRubyObject opts)
            throws JsonProcessingException, IOException, RaiseException {

        JavaConverter ikonv = new JavaBigIntValueConverter();
        JavaConverter dkonv = new JavaBigDecimalValueConverter();

        JavaHandler handler = new JavaHandler(ikonv, dkonv);
        JjParse parse = new JjParse(handler);
        JsonParser jp;
        try {
            jp = buildParser(context, RubyJacksonModule.factory, arg);
        } catch (IOException e) {
            throw context.runtime.newIOError(e.getLocalizedMessage());
        }

        parse.deserialize(jp);
        jp.close();
        return RubyUtils.rubyObject(context.runtime, handler.getResult());
    }
}
