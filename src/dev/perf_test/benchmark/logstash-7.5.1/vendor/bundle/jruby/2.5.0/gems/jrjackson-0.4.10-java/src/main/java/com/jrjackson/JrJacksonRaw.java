package com.jrjackson;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyHash;
import org.jruby.anno.JRubyMethod;
import org.jruby.anno.JRubyModule;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;

import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import org.jruby.exceptions.RaiseException;


@JRubyModule(name = "JrJacksonRaw")
public class JrJacksonRaw extends JrJacksonBase {

    public JrJacksonRaw(Ruby ruby, RubyClass metaclass) {
        super(ruby, metaclass);
    }

    // deserialize
    @JRubyMethod(module = true, name = {"parse", "load"}, required = 2)
    public static IRubyObject parse(ThreadContext context, IRubyObject self, IRubyObject arg, IRubyObject opts)
            throws IOException {
        Ruby _ruby = context.runtime;
        RubyHash options = null;

        if (opts != context.nil) {
            options = opts.convertToHash();

            return direct(context, self, arg,
                    flagged(options, RubyUtils.rubySymbol(_ruby, "use_bigdecimal")),
                    !flagged(options, RubyUtils.rubySymbol(_ruby, "use_smallint")),
                    flagged(options, RubyUtils.rubySymbol(_ruby, "symbolize_keys")),
                    flagged(options, RubyUtils.rubySymbol(_ruby, "raw")));

        } else {
            return direct(context, self, arg, false, true, false, false);
        }
    }

    private static IRubyObject direct(ThreadContext context, IRubyObject self, IRubyObject arg,
            boolean use_big_decimal, boolean use_big_int,
            boolean use_symbols, boolean use_raw) throws IOException {
        ObjectMapper local = RubyJacksonModule.rawBigNumberMapper();

        RubyConverter vci = new RubyIntValueConverter();
        RubyConverter vcf = new RubyFloatValueConverter();
        RubyKeyConverter kcn;

        if (use_big_decimal) {
            vcf = new RubyBigDecimalValueConverter();
        } else {
            local.disable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS);
        }

        if (use_big_int) {
            vci = new RubyBigIntValueConverter();
        } else {
            local.disable(DeserializationFeature.USE_BIG_INTEGER_FOR_INTS);
        }

        if(use_raw) {
            return _parse(context, arg, local);
        }

        if (use_symbols) {
            kcn = new RubySymbolKeyConverter();
        } else {
            kcn = new RubyStringKeyConverter();
        }

        local = RubyJacksonModule.mapperWith(context.runtime, kcn, vci, vcf);
        return _parse(context, arg, local);
    }

    @JRubyMethod(module = true, name = {"parse_raw", "load_raw"}, required = 1)
    public static IRubyObject parse_raw(ThreadContext context, IRubyObject self, IRubyObject arg)
            throws IOException, RaiseException {
        return direct(context, self, arg, false, false, false, true);
    }

    @JRubyMethod(module = true, name = {"parse_raw_bd", "load_raw_bd"}, required = 1)
    public static IRubyObject parse_raw_bd(ThreadContext context, IRubyObject self, IRubyObject arg)
            throws IOException, RaiseException {

        return direct(context, self, arg, true, true, false, true);
    }

    @JRubyMethod(module = true, name = {"parse_sym", "load_sym"}, required = 1)
    public static IRubyObject parse_sym(ThreadContext context, IRubyObject self, IRubyObject arg)
            throws IOException, RaiseException {

        return direct(context, self, arg, false, false, true, false);
    }

    @JRubyMethod(module = true, name = {"parse_str", "load_str"}, required = 1)
    public static IRubyObject parse_str(ThreadContext context, IRubyObject self, IRubyObject arg)
            throws IOException, RaiseException {

        return direct(context, self, arg, false, true, false, false);

    }
}
