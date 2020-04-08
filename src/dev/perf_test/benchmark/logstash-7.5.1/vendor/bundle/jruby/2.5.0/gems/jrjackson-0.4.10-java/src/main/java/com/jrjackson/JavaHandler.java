package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;


/**
 *
 * @author Guy Boertje
 */

/*
 Long -> Integer
 Double -> Float
 JavaMath::BigDecimal -> BigDecimal
 JavaMath::BigInteger -> Bignum
 JavaUtil::ArrayList -> Array
 JavaUtil::LinkedHashMap -> Hash
 String -> String
 */

public class JavaHandler implements IParseHandler<Object, ArrayList<Object>, HashMap<String, Object>> {

    private Object _result;
    private final JavaConverter _intConv;
    private final JavaConverter _floatConv;

    public JavaHandler(
            JavaConverter intConverter,
            JavaConverter floatConverter) {

        _intConv = intConverter;
        _floatConv = floatConverter;

    }

    @Override
    public void addValue(Object value) {
        _result = value;
    }

    @Override
    public Object hashStart() {
        return new HashMap<String, Object>();
    }

    @Override
    public void hashEnd() {

    }

    @Override
    public Object hashKey(String key) {
        return key;
    }

    @Override
    public void hashSet(HashMap<String, Object> hash, Object key, Object value) {
        hash.put((String)key, value);
    }

    @Override
    public Object arrayStart() {
        return new ArrayList<Object>();
    }

    @Override
    public void arrayEnd() {

    }

    @Override
    public void arrayAppend(ArrayList<Object> array, Object value) {
        array.add(value);
    }

    @Override
    public Object treatNull() {
        return null;
    }

    @Override
    public Object treatInt(JsonParser jp) throws IOException {
        return _intConv.convert(jp);
    }

    @Override
    public Object treatFloat(JsonParser jp) throws IOException {
        return _floatConv.convert(jp);
    }

    @Override
    public Object treatString(JsonParser jp) throws IOException {
        return jp.getText();
    }

    @Override
    public Object trueValue() {
        return true;
    }

    @Override
    public Object falseValue() {
        return false;
    }

    @Override
    public Object getResult() {
        return _result;
    }

    @Override
    public void raiseError(String e) {

    }
}
