package com.jrjackson;

import com.fasterxml.jackson.core.JsonGenerationException;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.jsontype.TypeSerializer;
import org.jruby.RubyArray;
import org.jruby.RubyClass;
import org.jruby.RubyException;
import org.jruby.RubyHash;
import org.jruby.RubyNumeric;
import org.jruby.RubyObject;
import org.jruby.RubyString;
import org.jruby.RubyStruct;
import org.jruby.RubyTime;
import org.jruby.ext.bigdecimal.RubyBigDecimal;
import org.jruby.internal.runtime.methods.DynamicMethod;
import org.jruby.java.proxies.JavaProxy;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;

import java.io.IOException;
import java.text.DateFormat;
import java.text.SimpleDateFormat;


public class RubyAnySerializer extends JsonSerializer<IRubyObject> {

    /**
     * Singleton instance to use.""
     */
    public static final RubyAnySerializer instance = new RubyAnySerializer();
    private static final String HLT = "#<";
    private static final String CSP = ": ";
    private static final String GT = ">";

    private static final RUBYCLASS[] CLASS_NAMES = RUBYCLASS.values();

    public RubyAnySerializer() {
//        super(IRubyObject.class);

    }

    private void serializeUnknownRubyObject(ThreadContext ctx, IRubyObject rubyObject, JsonGenerator jgen, SerializerProvider provider)
            throws IOException, JsonGenerationException {
        RubyClass meta = rubyObject.getMetaClass();

        DynamicMethod method = meta.searchMethod("to_json_data");
        if (!method.isUndefined()) {
            RubyObject obj = (RubyObject) method.call(ctx, rubyObject, meta, "to_json_data");
            if (obj instanceof RubyString) {
                RubyUtils.writeBytes(obj, jgen);
            } else {
                serialize(obj, jgen, provider);
            }
            return;
        }

        method = meta.searchMethod("to_time");
        if (!method.isUndefined()) {
            RubyTime dt = (RubyTime) method.call(ctx, rubyObject, meta, "to_time");
            serializeTime(dt, jgen, provider);
            return;
        }

        method = meta.searchMethod("to_h");
        if (!method.isUndefined()) {
            RubyObject obj = (RubyObject) method.call(ctx, rubyObject, meta, "to_h");
            serializeHash(obj, jgen, provider);
            return;
        }

        method = meta.searchMethod("to_hash");
        if (!method.isUndefined()) {
            RubyObject obj = (RubyObject) method.call(ctx, rubyObject, meta, "to_hash");
            serializeHash(obj, jgen, provider);
            return;
        }

        method = meta.searchMethod("to_a");
        if (!method.isUndefined()) {
            RubyObject obj = (RubyObject) method.call(ctx, rubyObject, meta, "to_a");
            serializeArray(obj, jgen, provider);
            return;
        }

        method = meta.searchMethod("to_json");
        if (!method.isUndefined()) {
            RubyObject obj = (RubyObject) method.call(ctx, rubyObject, meta, "to_json");
            if (obj instanceof RubyString) {
                jgen.writeRawValue(obj.toString());
            } else {
                serialize(obj, jgen, provider);
            }
            return;
        }

        if (!RubyUtils.isBasicObjectOrSubclass(rubyObject) && rubyObject.respondsTo("to_s")) {
            String result = rubyObject.toString();
            jgen.writeString(result);
        } else {
            String name = meta.getRealClass().getName();
            StringBuilder sb = new StringBuilder(2 + name.length());
            sb.append(HLT).append(name).append(GT);
            jgen.writeString(sb.toString());
        }
    }

    @Override
    public void serialize(IRubyObject value, JsonGenerator jgen, SerializerProvider provider)
            throws IOException, JsonGenerationException {

        String rubyClassName = value.getType().getName();

        if (value.isNil()) {
            jgen.writeNull(); // for RubyNil and NullObjects
            return;
        }

        if (value instanceof JavaProxy) {
            provider.defaultSerializeValue(((JavaProxy) value).getObject(), jgen);
            return;
        }

        if (value instanceof RubyStruct) {
            IRubyObject obj = value.callMethod(value.getRuntime().getCurrentContext(), "to_a");
            serializeArray(obj, jgen, provider);
            return;
        }

        if (value instanceof RubyException) {
            RubyException re = (RubyException) value;
            String msg = re.message(value.getRuntime().getCurrentContext()).toString();
            StringBuilder sb = new StringBuilder(5 + rubyClassName.length() + msg.length());
            sb.append(HLT).append(rubyClassName).append(CSP).append(msg).append(GT);
            jgen.writeString(sb.toString());
            return;
        }

        if (value.isClass() || value.isModule()) {
            jgen.writeString(value.inspect().toString());
            return;
        }

        RUBYCLASS clazz = null;

        for(RUBYCLASS v : CLASS_NAMES) {
            if(rubyClassName.equals(v.name())) {
                clazz = v;
                break;
            }
        }

        if (clazz == null) {
            serializeUnknownRubyObject(value.getRuntime().getCurrentContext(), value, jgen, provider);
            return;
        }

        switch (clazz) {
            case Hash:
                serializeHash(value, jgen, provider);
                break;
            case Array:
                serializeArray(value, jgen, provider);
                break;
            case String:
                RubyUtils.writeBytes(value, jgen);
                break;
            case Symbol:
            case Date:
                // Date to_s -> yyyy-mm-dd
                RubyString s = value.asString();
                jgen.writeUTF8String(s.getBytes(), 0, s.size());
                break;
            case TrueClass:
            case FalseClass:
                jgen.writeBoolean(value.isTrue());
                break;
            case Float:
                jgen.writeNumber(RubyNumeric.num2dbl(value));
                break;
            case Bignum:
            case Fixnum:
            case Integer:
                if (value.getJavaClass() == long.class) {
                    jgen.writeNumber(((RubyNumeric) value).getLongValue());
                } else {
                    jgen.writeNumber(((RubyNumeric) value).getBigIntegerValue());
                }
                break;
            case BigDecimal:
                jgen.writeNumber(((RubyBigDecimal) value).getBigDecimalValue());
                break;
            case Time:
                serializeTime((RubyTime) value, jgen, provider);
                break;
            default:
                serializeUnknownRubyObject(value.getRuntime().getCurrentContext(), value, jgen, provider);
                break;
        }
    }

    private void serializeArray(IRubyObject value, JsonGenerator jgen, SerializerProvider provider)
            throws IOException, JsonGenerationException {
//            System.err.println("----->> RubyArray");

        RubyArray arr = (RubyArray) value;
        IRubyObject[] a = arr.toJavaArray();
        jgen.writeStartArray();
        for (IRubyObject val : a) {
            serialize(val, jgen, provider);
        }
        jgen.writeEndArray();
    }

    private void serializeHash(IRubyObject value, JsonGenerator jgen, SerializerProvider provider)
            throws IOException, JsonGenerationException {
//            System.err.println("----->> RubyHash");

        RubyHash h = (RubyHash) value;
        jgen.writeStartObject();
        for (Object o : h.directEntrySet()) {
            RubyHash.RubyHashEntry next = (RubyHash.RubyHashEntry) o;
            serializeKey((IRubyObject) next.getKey(), jgen, provider);
            serialize((IRubyObject) next.getValue(), jgen, provider);
        }
        jgen.writeEndObject();
    }

    private void serializeTime(RubyTime dt, JsonGenerator jgen, SerializerProvider provider)
            throws IOException, JsonGenerationException {
        DateFormat df = provider.getConfig().getDateFormat();
        if (df == null) {
            // DateFormat should always be set
            provider.defaultSerializeDateValue(dt.getJavaDate(), jgen);
        } // RWB Note: I believe this is no longer used
        else if (df instanceof RubyDateFormat) {
            // why another branch? I thought there was an easy win on to_s
            // maybe with jruby 9000
            RubyDateFormat clonedRubyDateFormat = (RubyDateFormat) df.clone();
            jgen.writeString(clonedRubyDateFormat.format(dt.getJavaDate()));
        } else {
            jgen.writeString(df.format(dt.getJavaDate()));
        }
    }

    private void serializeKey(IRubyObject key, JsonGenerator jgen, SerializerProvider provider)
            throws IOException, JsonGenerationException {
        if (key instanceof RubyString) {
            jgen.writeFieldName(((RubyString) key).decodeString());
        } else {
            // includes RubySymbol and non RubyString objects
            jgen.writeFieldName(key.toString());
        }
    }

    /**
     * Default implementation will write type prefix, call regular serialization method (since assumption is that value itself does not need JSON Array or Object start/end markers), and then write type suffix. This should work for most cases; some sub-classes may want to change this behavior.
     *
     * @param value
     * @param jgen
     * @param provider
     * @param typeSer
     * @throws java.io.IOException
     * @throws com.fasterxml.jackson.core.JsonGenerationException
     */
    @Override
    public void serializeWithType(IRubyObject value, JsonGenerator jgen, SerializerProvider provider, TypeSerializer typeSer)
            throws IOException, JsonGenerationException {
        typeSer.writeTypePrefixForScalar(value, jgen);
        serialize(value, jgen, provider);
        typeSer.writeTypeSuffixForScalar(value, jgen);
    }

    enum RUBYCLASS {
        String,
        Fixnum,
        Integer,
        Hash,
        Array,
        Float,
        BigDecimal,
        Time,
        Bignum,
        Date,
        Symbol,
        TrueClass,
        FalseClass
    }
}
