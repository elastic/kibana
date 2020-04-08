package com.jrjackson;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.Version;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.SerializationConfig;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.DefaultSerializerProvider;
import com.fasterxml.jackson.module.afterburner.AfterburnerModule;
import org.jruby.Ruby;
import org.jruby.runtime.builtin.IRubyObject;

import java.text.SimpleDateFormat;
import java.util.TimeZone;

public class RubyJacksonModule extends SimpleModule {
    public static final ObjectMapper static_mapper = new ObjectMapper();
    public static final JsonFactory factory = new JsonFactory(static_mapper).disable(JsonFactory.Feature.FAIL_ON_SYMBOL_HASH_OVERFLOW);
    private static final TimeZone utcTimeZone = TimeZone.getTimeZone("UTC");

    private static final ThreadLocal<SimpleDateFormat>  dateFormat = new ThreadLocal<SimpleDateFormat> ()  {
        @Override
        protected SimpleDateFormat initialValue() {
            SimpleDateFormat rdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss Z");
            rdf.setTimeZone(utcTimeZone);
            return rdf;
        }
    };

    static {
        static_mapper.registerModule(new RubyJacksonModule().addSerializer(
                IRubyObject.class, RubyAnySerializer.instance
        ));
        static_mapper.registerModule(new AfterburnerModule());
        static_mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    private RubyJacksonModule() {
        super("JrJacksonStrModule", new Version(1, 2, 28, "0", "com.jrjackson.jruby", "jrjackson"));
    }

    public static ObjectMapper mapperWith(Ruby ruby, RubyKeyConverter nameConverter,
            RubyConverter intConverter, RubyConverter floatConverter) {

        return static_mapper.copy().registerModule(
                new RubyJacksonModule().addDeserializer(
                        Object.class,
                        new RubyObjectDeserializer().with(ruby, nameConverter, intConverter, floatConverter)
                )
        );
    }

    public static ObjectMapper rawMapper() {
        return static_mapper;
    }

    public static DefaultSerializerProvider createProvider(SimpleDateFormat sdf) {
        // Use a copy of the SerializationConfig to avoid calling setDateFormat on the static ObjectMapper
        // object, removing its thread safety properties. In future, we might want to think about doing
        // a refactor to use ObjectWriters instead of modifying serialization configs.
        SerializationConfig config = static_mapper.getSerializationConfig().with(sdf);
        return ((DefaultSerializerProvider) static_mapper.getSerializerProvider()).createInstance(
                config,
                static_mapper.getSerializerFactory()
        );
    }

    public static DefaultSerializerProvider createProvider() {
        return createProvider(dateFormat.get());
    }

    public static ObjectMapper rawBigNumberMapper() {
        static_mapper.enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS);
        static_mapper.enable(DeserializationFeature.USE_BIG_INTEGER_FOR_INTS);
        return static_mapper;
    }

}
