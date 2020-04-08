package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonStreamContext;
import org.jruby.RubyArray;
import org.jruby.RubyHash;
import org.jruby.runtime.builtin.IRubyObject;

import java.io.IOException;
import java.util.HashMap;


/**
 *
 * @author Guy Boertje
 */
public class JrParse {
    private final RubyHandler _handler;
    private final HashMap<JsonStreamContext, IRubyObject> _objectMap = new HashMap<JsonStreamContext, IRubyObject>();
    private JsonStreamContext _deepestContext;
    
    public JrParse(RubyHandler handler) {
        _handler = handler;
    }

    public void deserialize(JsonParser jp) throws IOException {
        try {

            while (jp.nextValue() != null) {
                handleRubyToken(jp);
            }
        } catch (IOException e) {
            _handler.raiseError(e.getLocalizedMessage());
        }
    }

    private void addRubyValue(JsonStreamContext x) {
        JsonStreamContext px = x.getParent();
        IRubyObject dtarget = _objectMap.get(_deepestContext);
        
        if (px == null) {
            _handler.addValue(dtarget);
            return;
        }
        
        IRubyObject value = _objectMap.get(x);

        if (x.inArray()) {
            _handler.arrayAppend(
                    (RubyArray)value, dtarget);
        } else if (x.inObject()) {
            _handler.hashSet(
                    (RubyHash)value, getRubyHashKey(x), dtarget);

        } else {
            _handler.addValue(value);
        }
    }
    
    private void addRubyValue(JsonStreamContext x, IRubyObject val) {
        
        if (x.inArray()) {
            RubyArray a = (RubyArray)_objectMap.get(x);
            _handler.arrayAppend(a, val);
        } else if (x.inObject()) {
            RubyHash h = (RubyHash)_objectMap.get(x);
            _handler.hashSet(h, getRubyHashKey(x), val);
            
        } else {
            _handler.addValue(val);
        }
    }
    
    private IRubyObject getRubyHashKey(JsonStreamContext x) {
        String k = x.getCurrentName();
        if (k == null) {
            return _handler.treatNull();
        }
        return _handler.hashKey(k);
    }
    
    protected void handleRubyToken(JsonParser jp)
            throws IOException {
        
        JsonStreamContext cx = jp.getParsingContext();
        
        switch (jp.getCurrentToken()) {
            case START_OBJECT:
                _deepestContext = cx;
                _objectMap.put(cx, _handler.hashStart());
                break;
                
            case START_ARRAY:
                _deepestContext = cx;
                _objectMap.put(cx, _handler.arrayStart());
                
            case FIELD_NAME:
                break;
                
            case VALUE_EMBEDDED_OBJECT:
                System.out.println("-------- VALUE_EMBEDDED_OBJECT ????????? --------");
                System.out.println(jp.getEmbeddedObject());
                break;
                
            case VALUE_STRING:
                addRubyValue(cx, _handler.treatString(jp));
                break;
            
            case VALUE_NUMBER_INT:
                addRubyValue(cx, _handler.treatInt(jp));
                break;
                
            case VALUE_NUMBER_FLOAT:
                addRubyValue(cx, _handler.treatFloat(jp));
                break;
                
            case VALUE_TRUE:
                addRubyValue(cx, _handler.trueValue());
                break;

            case VALUE_FALSE:
                addRubyValue(cx, _handler.falseValue());
                break;

            case VALUE_NULL: // should not get this but...
                addRubyValue(cx, _handler.treatNull());
                break;

            case END_ARRAY:
                _handler.arrayEnd();
                addRubyValue(cx);
                _deepestContext = cx;
                break;

            case END_OBJECT:
                _handler.hashEnd();
                addRubyValue(cx);
                _deepestContext = cx;
                break;
        }
    }
}
