package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import java.io.IOException;

/**
 *
 * @author Guy Boertje
 */
public class JavaFloatValueConverter implements JavaConverter {

    @Override
    public Double convert(JsonParser jp) throws IOException {
        return jp.getDoubleValue();
    }
}
