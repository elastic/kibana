/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import java.io.IOException;

/**
 *
 * @author guy
 * @param <T>
 * @param <U>
 * @param <V>
 */
public interface IParseHandler<T, U, V> {

    void addValue(T value);

    void arrayAppend(U array, T value);

    void arrayEnd();

    T arrayStart();

    T falseValue();

    T getResult();

    void hashEnd();

    T hashKey(String key);

    void hashSet(V hash, T key, T value);

    T hashStart();

    void raiseError(String e);

    T treatFloat(JsonParser jp) throws IOException;

    T treatInt(JsonParser jp) throws IOException;

    T treatNull();

    T treatString(JsonParser jp) throws IOException;

    T trueValue();


}
