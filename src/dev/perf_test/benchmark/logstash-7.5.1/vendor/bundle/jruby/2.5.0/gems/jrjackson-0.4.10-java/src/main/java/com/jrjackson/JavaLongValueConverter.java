package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import java.io.IOException;

/**
 *
 * @author Guy Boertje
 */
public class JavaLongValueConverter implements JavaConverter {

    @Override
    public Long convert(JsonParser jp) throws IOException {
        return jp.getLongValue();
    }
}
