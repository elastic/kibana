package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.JsonStreamContext;
import java.io.IOException;
import java.util.HashMap;

import org.jruby.internal.runtime.methods.DynamicMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.RubyString;
import org.jruby.exceptions.RaiseException;

/**
 *
 * @author Guy Boertje
 */
public class SchParse  extends StreamParse {

    protected final DynamicMethod _hash_key;
    protected final boolean _no_hash_key;
    
    protected final DynamicMethod _hash_set;
    protected final boolean _no_hash_set;
    
    protected final DynamicMethod _array_append;
    protected final boolean _no_array_append;
    
    protected final HashMap<JsonStreamContext, IRubyObject> _objectMap = new HashMap<JsonStreamContext, IRubyObject>();
    protected JsonStreamContext _deepestContext;
    
    public SchParse(ThreadContext ctx, IRubyObject handler)
            throws RaiseException {
        super(ctx, handler);
        
        _hash_key = _meta.searchMethod("hash_key");
        _no_hash_key = _hash_key.isUndefined();
        
        _hash_set = _meta.searchMethod("hash_set");
        _no_hash_set = _hash_set.isUndefined();

        _array_append = _meta.searchMethod("array_append");
        _no_array_append = _array_append.isUndefined();
        
        //_hash_key is optional
        if (
            _no_hash_start || _no_hash_end ||
            _no_array_start || _no_array_end ||
            _no_add_value || _no_hash_set || _no_array_append
        ) {
            throw ParseError.newParseError(_ruby, "Handler does not implement public API");
        }
    }

    @Override
    public IRubyObject deserialize(JsonParser jp) throws RaiseException {
        try {
            
            while (jp.nextValue() != null) {
                handleCurrentToken(jp);
            }
            return _ctx.nil;
            
        } catch (JsonProcessingException e) {
            throw ParseError.newParseError(_ruby, e.getLocalizedMessage());
        } catch (IOException e) {
            throw _ruby.newIOError(e.getLocalizedMessage());
        }
    }

    private void callAddValue(JsonStreamContext x) {
        JsonStreamContext px = x.getParent();
        IRubyObject target = _objectMap.get(x);
        IRubyObject dtarget = _objectMap.get(_deepestContext);

        if (px == null) {
            _add_value.call(_ctx, _handler, _meta, "add_value", dtarget);
            return;
        }
        
        if (x.inArray()) {
            _array_append.call(_ctx, _handler, _meta, "array_append", target, dtarget);
        } else if (x.inObject()) {
            IRubyObject treatedKey = callHashKey(x);
            _hash_set.call(_ctx, _handler, _meta, "hash_set", target, treatedKey, dtarget);
        } else {
            _add_value.call(_ctx, _handler, _meta, "add_value", target);
        }
    }

    private void callAddValue(JsonStreamContext x, IRubyObject val) {
        IRubyObject target = _objectMap.get(x);

        if (x.inArray()) {
            _array_append.call(_ctx, _handler, _meta, "array_append", target, val);
        } else if (x.inObject()) {
            IRubyObject treatedKey = callHashKey(x);
            _hash_set.call(_ctx, _handler, _meta, "hash_set", target, treatedKey, val);
        } else {
            _add_value.call(_ctx, _handler, _meta, "add_value", val);
        }
    }
    
    private IRubyObject callHashKey(JsonStreamContext x) {
        String k = x.getCurrentName();
        if (k == null) {
            return _ctx.nil;
        }
        RubyString key =  RubyUtils.rubyString(_ruby, k);
        if (_no_hash_key) {
            return key;
        }
        return _hash_key.call(_ctx, _handler, _meta, "hash_key", key);
    }

    private void handleCurrentToken(JsonParser jp)
            throws IOException, JsonProcessingException {
        
        JsonStreamContext cx = jp.getParsingContext();
        IRubyObject value;
        IRubyObject rubyObject;

        switch (jp.getCurrentToken()) {
            case START_OBJECT:
                _deepestContext = cx;
                rubyObject = _hash_start.call(_ctx, _handler, _meta, "hash_start");
                _objectMap.put(cx, rubyObject);
                break;

            case START_ARRAY:
                _deepestContext = cx;
                rubyObject = _array_start.call(_ctx, _handler, _meta, "array_start");
                _objectMap.put(cx, rubyObject);
                break;

            case FIELD_NAME:
                break;

            case VALUE_EMBEDDED_OBJECT:
                value = RubyUtils.rubyObject(_ruby, jp.getEmbeddedObject());
                callAddValue(cx, value);
                break;

            case VALUE_STRING:
                value = keyConverter.convert(_ruby, jp);
                callAddValue(cx, value);
                break;

            case VALUE_NUMBER_INT:
                /* [JACKSON-100]: caller may want to get all integral values
                 * returned as BigInteger, for consistency
                 */
                JsonParser.NumberType numberType = jp.getNumberType();
                value = RubyUtils.rubyBignum(_ruby, jp.getBigIntegerValue());
                callAddValue(cx, value);
                break;

            case VALUE_NUMBER_FLOAT:
                value = RubyUtils.rubyBigDecimal(_ruby, jp.getDecimalValue());
                callAddValue(cx, value);
                break;

            case VALUE_TRUE:
                value = _ruby.newBoolean(Boolean.TRUE);
                callAddValue(cx, value);
                break;

            case VALUE_FALSE:
                value = _ruby.newBoolean(Boolean.FALSE);
                callAddValue(cx, value);
                break;

            case VALUE_NULL: // should not get this but...
                value = _ctx.nil;
                callAddValue(cx, value);
                break;

            case END_ARRAY:
                _array_end.call(_ctx, _handler, _meta, "array_end");
                callAddValue(cx);
                _deepestContext = cx;
                break;

            case END_OBJECT:
                _hash_end.call(_ctx, _handler, _meta, "hash_end");
                callAddValue(cx);
                _deepestContext = cx;
                break;
        }
        
    }
    
}
//        System.out.println("--- addRubyValue final ---");
//        if (px != null) {
//            System.out.println("-------- parent --------");
//            System.out.println(px.getTypeDesc());
//            System.out.println(px.getCurrentName());
//        }
//        System.out.println("-------- current --------");
//        System.out.println(x.getTypeDesc());
//        System.out.println(x.getCurrentName());
//        System.out.println(target);
//        
//        System.out.println("-------- deepest --------");
//        System.out.println(_deepestContext.getTypeDesc());
//        System.out.println(_deepestContext.getCurrentName());
//        System.out.println(dtarget);
