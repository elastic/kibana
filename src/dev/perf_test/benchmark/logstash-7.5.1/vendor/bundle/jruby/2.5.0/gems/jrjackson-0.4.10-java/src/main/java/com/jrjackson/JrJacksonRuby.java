package com.jrjackson;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.anno.JRubyModule;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;

import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import static com.jrjackson.JrJacksonBase.flagged;
import org.jruby.RubyHash;
import org.jruby.exceptions.RaiseException;

@JRubyModule(name = "JrJacksonRuby")
public class JrJacksonRuby extends JrJacksonBase {

    public JrJacksonRuby(Ruby ruby, RubyClass metaclass) {
        super(ruby, metaclass);
    }

    // deserialize
    @JRubyMethod(module = true, name = {"parse_sym", "load_sym"}, required = 2)
    public static IRubyObject parse_sym(ThreadContext context, IRubyObject self, IRubyObject arg, IRubyObject opts)
            throws JsonProcessingException, IOException, RaiseException {

        return __parse(context, arg,
                new RubySymbolNameConverter(),
                new RubyBigIntValueConverter(),
                new RubyBigDecimalValueConverter()
        );
    }

    @JRubyMethod(module = true, name = {"parse", "load"}, required = 2)
    public static IRubyObject parse(ThreadContext context, IRubyObject self, IRubyObject arg, IRubyObject opts)
            throws JsonProcessingException, IOException, RaiseException {

        RubyNameConverter konv = new RubyStringNameConverter();
        RubyConverter ikonv = new RubyBigIntValueConverter();
        RubyConverter dkonv = new RubyBigDecimalValueConverter();
        if (opts != context.nil) {
            RubyHash options = opts.convertToHash();
            if (options.size() > 0) {
                if (flagged(options,
                        RubyUtils.rubySymbol(context.runtime, "symbolize_keys"))) {
                    konv = new RubySymbolNameConverter();
                }
                if (!flagged(options,
                        RubyUtils.rubySymbol(context.runtime, "use_bigdecimal"), true)) {
                    dkonv = new RubyFloatValueConverter();
                }
                if (flagged(options,
                        RubyUtils.rubySymbol(context.runtime, "use_smallint"))) {
                    ikonv = new RubyIntValueConverter();
                }
            }
        }
        return __parse(context, arg, konv, ikonv, dkonv);
    }

    private static IRubyObject __parse(ThreadContext context, IRubyObject arg,
                RubyNameConverter keykonv, RubyConverter intconv, RubyConverter decimalconv)
            throws JsonProcessingException, IOException, RaiseException {

        RubyHandler handler = new RubyHandler(context,
                keykonv,
                intconv,
                decimalconv);
        JrParse parse = new JrParse(handler);
        ObjectMapper mapper = RubyJacksonModule.rawBigNumberMapper();
        JsonFactory jf = mapper.getFactory().disable(JsonFactory.Feature.FAIL_ON_SYMBOL_HASH_OVERFLOW);
        JsonParser jp;
        try {

            jp = buildParser(context, jf, arg);

        } catch (IOException e) {
            throw context.runtime.newIOError(e.getLocalizedMessage());
        }
        parse.deserialize(jp);
        jp.close();
        return handler.getResult();
    }
}
