package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.JsonStreamContext;
import com.fasterxml.jackson.core.JsonLocation;

import java.io.IOException;

import org.jruby.internal.runtime.methods.DynamicMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.exceptions.RaiseException;

/**
 *
 * @author Guy Boertje
 */
public class SajParse extends StreamParse {
    
    protected DynamicMethod _error;
    protected boolean _no_error;

    public SajParse(ThreadContext ctx, IRubyObject handler)
            throws RaiseException {
        super(ctx, handler);
        
        if (_no_add_value) {
            throw ParseError.newParseError(_ruby, "Handler does not implement public API");
        }        
        _error = _meta.searchMethod("error");
        _no_error = _error.isUndefined();
    
    }
    
    @Override
    public IRubyObject deserialize(JsonParser jp) {

        try {
            while(jp.nextValue() != null) {
                handleCurrentToken(jp);
            }
        }
        catch (JsonProcessingException e) {
            if(!_no_error) {
                JsonLocation location = e.getLocation();
                IRubyObject message = RubyUtils.rubyString(_ruby, e.getMessage());
                IRubyObject line = RubyUtils.rubyFixnum(_ruby, location.getLineNr());
                IRubyObject column = RubyUtils.rubyFixnum(_ruby, location.getColumnNr());
                
                _error.call(_ctx, _handler, _meta, "error", message, line, column);
            }
        }
        catch (IOException e) {
            if(!_no_error) {
                IRubyObject message = RubyUtils.rubyString(_ruby, e.getMessage());
                IRubyObject line = RubyUtils.rubyFixnum(_ruby, 1);
                IRubyObject column = RubyUtils.rubyFixnum(_ruby, 1);
                
                _error.call(_ctx, _handler, _meta, "error", message, line, column);
            }
        }

        return _ctx.nil;
    }
    
    private void callAddValue(IRubyObject val, IRubyObject key) {
        _add_value.call(_ctx, _handler, _meta, "add_value", val, key);
    }
    
    private IRubyObject getParentName(JsonStreamContext x) {
        String parentName = x.getCurrentName();
        IRubyObject parent = _ctx.nil;
        
        if (!x.inRoot()) {
            parentName = x.getParent().getCurrentName();
        }
        if (parentName != null) {
            parent = RubyUtils.rubyString(_ruby, parentName);
        }
        return parent;
    }
    
    private IRubyObject getFieldName(JsonStreamContext x) {
        String currentName = x.getCurrentName();
        IRubyObject name = _ctx.nil;

        if (currentName != null) {
            name = RubyUtils.rubyString(_ruby, currentName);
        }
        return name;
    }
    
    private void handleCurrentToken(JsonParser jp)
            throws IOException, JsonProcessingException {
        
        JsonStreamContext cx = jp.getParsingContext();
  
        IRubyObject value;
        
        switch (jp.getCurrentToken()) {
            case START_OBJECT:
                if (!_no_hash_start) {
                    _hash_start.call(_ctx, _handler, _meta, "hash_start", getParentName(cx));
                }
                break;
                
            case START_ARRAY:
                if (!_no_array_start) {
                    _array_start.call(_ctx, _handler, _meta, "array_start", getParentName(cx));
                }
                break;

            case FIELD_NAME:
                break;
                
            case VALUE_EMBEDDED_OBJECT:
                value = RubyUtils.rubyObject(_ruby, jp.getEmbeddedObject());
                callAddValue(value, getFieldName(cx));
                break;
                
            case VALUE_STRING:
                value = keyConverter.convert(_ruby, jp);
                callAddValue(value, getFieldName(cx));
                break;
                
            case VALUE_NUMBER_INT:
                /* [JACKSON-100]: caller may want to get all integral values
                * returned as BigInteger, for consistency
                */
                JsonParser.NumberType numberType = jp.getNumberType();
                value = RubyUtils.rubyBignum(_ruby, jp.getBigIntegerValue());
                callAddValue(value, getFieldName(cx));
                break;
                
            case VALUE_NUMBER_FLOAT:
                value = RubyUtils.rubyBigDecimal(_ruby, jp.getDecimalValue());
                callAddValue(value, getFieldName(cx));
                break;
                
            case VALUE_TRUE:
                value = _ruby.newBoolean(Boolean.TRUE);
                callAddValue(value, getFieldName(cx));
                break;
                
            case VALUE_FALSE:
                value = _ruby.newBoolean(Boolean.FALSE);
                callAddValue(value, getFieldName(cx));
                break;
                
            case VALUE_NULL: // should not get this but...
                value = _ctx.nil;
                callAddValue(value, getFieldName(cx));
                break;
               
            case END_ARRAY:
                if (!_no_array_end) {
                    _array_end.call(_ctx, _handler, _meta, "array_end", getFieldName(cx));
                }
                break;
                
            case END_OBJECT:
                if (!_no_hash_end) {
                    _hash_end.call(_ctx, _handler, _meta, "hash_end", getFieldName(cx));
                }
                break;
        }
    }
}
