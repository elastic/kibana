package com.jrjackson;

import com.fasterxml.jackson.core.*;

import java.io.IOException;

public interface JavaConverter {

    public Object convert(JsonParser jp) throws IOException;
}
