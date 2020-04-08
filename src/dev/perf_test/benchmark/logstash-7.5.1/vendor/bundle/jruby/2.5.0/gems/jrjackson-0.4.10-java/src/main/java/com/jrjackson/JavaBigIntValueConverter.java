package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import java.io.IOException;
import java.math.BigInteger;

/**
 *
 * @author Guy Boertje
 */
public class JavaBigIntValueConverter implements JavaConverter {

    @Override
    public BigInteger convert(JsonParser jp) throws IOException {
        return jp.getBigIntegerValue();
    }
}
