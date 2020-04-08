package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonStreamContext;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;

/**
 *
 * @author Guy Boertje
 */
public class JjParse {

    private final JavaHandler _handler;
    private final HashMap<JsonStreamContext, Object> _objectMap = new HashMap<>();
    private JsonStreamContext _deepestContext;

    public JjParse(JavaHandler handler) {
        _handler = handler;
    }

    public void deserialize(JsonParser jp) throws IOException {
        try {

            while (jp.nextValue() != null) {
                handleJavaToken(jp);
            }
        } catch (IOException e) {
            _handler.raiseError(e.getLocalizedMessage());
        }
    }

    private void addJavaValue(JsonStreamContext x) {
        JsonStreamContext px = x.getParent();
        Object dtarget = _objectMap.get(_deepestContext);

        if (px == null) {
            _handler.addValue(dtarget);
            return;
        }

        Object value = _objectMap.get(x);

        if (x.inArray()) {
            _handler.arrayAppend(
                    (ArrayList<Object>)value, dtarget);
        } else if (x.inObject()) {
            _handler.hashSet(
                    (HashMap<String, Object>)value, getJavaHashKey(x), dtarget);

        } else {
            _handler.addValue(value);
        }
    }

    private void addJavaValue(JsonStreamContext x, Object val) {
        if (x.inArray()) {
            ArrayList<Object> a = (ArrayList<Object>)_objectMap.get(x);
            _handler.arrayAppend(a, val);
        } else if (x.inObject()) {
            HashMap<String, Object> h = (HashMap<String, Object>)_objectMap.get(x);
            _handler.hashSet(h, getJavaHashKey(x), val);

        } else {
            _handler.addValue(val);
        }
    }

    private String getJavaHashKey(JsonStreamContext x) {
        String k = x.getCurrentName();
        if (k == null) {
            return null;
        }
        return (String)_handler.hashKey(k);
    }

    protected void handleJavaToken(JsonParser jp)
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
                addJavaValue(cx, _handler.treatString(jp));
                break;

            case VALUE_NUMBER_INT:
                addJavaValue(cx, _handler.treatInt(jp));
                break;

            case VALUE_NUMBER_FLOAT:
                addJavaValue(cx, _handler.treatFloat(jp));
                break;

            case VALUE_TRUE:
                addJavaValue(cx, _handler.trueValue());
                break;

            case VALUE_FALSE:
                addJavaValue(cx, _handler.falseValue());
                break;

            case VALUE_NULL: // should not get this but...
                addJavaValue(cx, _handler.treatNull());
                break;

            case END_ARRAY:
                _handler.arrayEnd();
                addJavaValue(cx);
                _deepestContext = cx;
                break;

            case END_OBJECT:
                _handler.hashEnd();
                addJavaValue(cx);
                _deepestContext = cx;
                break;
        }
    }
}
